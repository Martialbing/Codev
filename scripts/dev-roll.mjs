import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { repoRoot, resolveCargoTargetDir } from "./lib/cargo-target-dir.mjs";

const USAGE = `用法：pnpm dev:roll [选项]

  --debug       用 debug profile 构建（默认 release，和正式包一致；debug 编译快但运行慢）
  --restart     替换后结束并重新打开正在运行的 Codev（会丢未保存的编辑）
  --pull        先同步上游：main 快进，dev 把上游 main 合进来
  --no-launch   只构建和替换，不打开窗口
  -h, --help    显示本帮助

替换目标：已安装的 Codev（Windows 为 %LOCALAPPDATA%\\Codev\\codev.exe），
可用环境变量 CODEV_ROLL_TARGET 指定可执行文件路径。
只跑 tauri build --no-bundle：不生成便携包、不写 artifacts/、不改版本号、不打 tag。
identifier 沿用 app.teague.codev，所以只有一个 Codev，状态和任务栏都不用迁移。`;

const FLAGS = new Set();
for (const arg of process.argv.slice(2)) {
  if (arg === "-h" || arg === "--help") {
    console.log(USAGE);
    process.exit(0);
  }
  if (!["--debug", "--restart", "--pull", "--no-launch"].includes(arg)) {
    fail("未知参数：" + arg + "\n\n" + USAGE);
  }
  FLAGS.add(arg);
}

const IS_WINDOWS = process.platform === "win32";
const PROFILE = FLAGS.has("--debug") ? "debug" : "release";

function step(message) {
  console.log("[Codev dev] " + message);
}

function fail(message) {
  console.error("\n[Codev dev] 停止：" + message);
  process.exit(1);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** 运行命令并继承输出，返回退出码。 */
function runInherit(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) fail("无法执行 " + command + "：" + result.error.message);
  return result.status ?? 1;
}

/** 运行命令并读取输出；命令失败时返回空字符串。 */
function read(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error || result.status !== 0) return "";
  return result.stdout ?? "";
}

function samePath(left, right) {
  if (!left || !right) return false;
  const a = path.resolve(left);
  const b = path.resolve(right);
  return IS_WINDOWS ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** 正在运行的 cargo/rustc；有并发编译时必须停下，不能等锁。 */
function compilerProcesses() {
  if (IS_WINDOWS) {
    return ["cargo.exe", "rustc.exe"].filter((name) =>
      read("tasklist", ["/FI", "IMAGENAME eq " + name, "/NH"]).includes(name),
    );
  }
  return ["cargo", "rustc"].filter((name) => read("pgrep", ["-x", name]).trim() !== "");
}

/** 只认目标可执行文件的确切路径，避免碰到别的 Codev 调试窗口。 */
function runningInstances(exe) {
  if (IS_WINDOWS) {
    const script = "Get-CimInstance Win32_Process -Filter \"Name='" + path.basename(exe)
      + "'\" | ForEach-Object { \"$($_.ProcessId)|$($_.ExecutablePath)\" }";
    return read("powershell", ["-NoProfile", "-Command", script])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("|");
        return { pid: Number(line.slice(0, separator)), exe: line.slice(separator + 1) };
      })
      .filter((item) => Number.isInteger(item.pid) && item.pid > 0 && samePath(item.exe, exe));
  }
  const output = read("pgrep", ["-f", exe]).trim();
  return output
    ? output.split(/\r?\n/).map((line) => ({ pid: Number(line.trim()), exe })).filter((item) => item.pid > 0)
    : [];
}

function stopInstances(instances) {
  for (const instance of instances) {
    if (IS_WINDOWS) {
      read("taskkill", ["/PID", String(instance.pid), "/T", "/F"]);
    } else {
      read("kill", ["-TERM", String(instance.pid)]);
    }
  }
  for (let i = 0; i < 20 && runningInstances(targetExe()).length; i += 1) sleep(100);
}

function resolveTargetExe() {
  const override = process.env.CODEV_ROLL_TARGET;
  if (override) return path.resolve(override);
  if (IS_WINDOWS) {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Codev", "codev.exe");
  }
  fail("非 Windows 平台先用 CODEV_ROLL_TARGET 指定已安装的 Codev 可执行文件路径。");
}

let cachedTarget = null;
function targetExe() {
  if (!cachedTarget) cachedTarget = resolveTargetExe();
  return cachedTarget;
}

function gitInfo() {
  const branch = read("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim() || "detached";
  const head = read("git", ["rev-parse", "--short", "HEAD"]).trim() || "unknown";
  const dirty = read("git", ["status", "--porcelain"]).trim() !== "";
  return branch + " " + head + (dirty ? "（有未提交改动）" : "");
}

/** 上游远端优先取 upstream（origin 指向自己的 fork 时），单远端仓库回退 origin。 */
function upstreamRemote() {
  const remotes = read("git", ["remote"]).split(/\s+/).filter(Boolean);
  return remotes.includes("upstream") ? "upstream" : "origin";
}

/** main 只允许快进，其它分支把上游 main 合进来。 */
function syncUpstream() {
  const remote = upstreamRemote();
  const base = remote + "/main";
  step("同步上游（git fetch " + remote + "）...");
  if (runInherit("git", ["fetch", remote]) !== 0) {
    fail("git fetch " + remote + " 失败，未改动 " + targetExe() + "。");
  }
  const branch = read("git", ["rev-parse", "--abbrev-ref", "HEAD"]).trim() || "HEAD";
  const counting = read("git", ["rev-list", "--count", "HEAD.." + base]).trim();
  if (!/^\d+$/.test(counting)) fail("读不到 " + base + " 与 HEAD 的差距，未改动 " + targetExe() + "。");
  const behind = Number.parseInt(counting, 10);
  if (behind === 0) {
    step(branch + " 已经包含 " + base + " 的全部提交。");
    return;
  }
  if (branch === "main") {
    if (runInherit("git", ["merge", "--ff-only", base]) !== 0) {
      fail("main 只能快进到 " + base + "；本地 main 不应该有提交，未改动 " + targetExe() + "。");
    }
    return;
  }
  step("把 " + base + " 的 " + behind + " 个提交合入 " + branch + "...");
  if (runInherit("git", ["merge", "--no-edit", base]) !== 0) {
    read("git", ["merge", "--abort"]);
    fail("合入 " + base + " 出现冲突，已回滚这次合入；手动解决后再滚，未改动 " + targetExe() + "。");
  }
}

const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
if (pkg.name !== "codev") fail("必须在 Codev 仓库根目录运行：" + repoRoot);

const target = targetExe();
if (!existsSync(target)) {
  fail(
    "找不到已安装的 Codev：" + target + "\n"
      + "先用正式安装包装一份，或用 CODEV_ROLL_TARGET 指向要替换的可执行文件。",
  );
}

if (FLAGS.has("--pull")) syncUpstream();

const compilers = compilerProcesses();
if (compilers.length) {
  fail(
    "检测到正在运行的编译进程：" + compilers.join("、") + "。\n"
      + "先复用或关闭已有开发会话（并发编译会抢 target 锁），未改动 " + target + "。",
  );
}

// 工具链坏了会让 tauri-cli 直接 panic，这里先给出可读的原因。
const rustcProbe = spawnSync("rustc", ["-vV"], { cwd: repoRoot, encoding: "utf8" });
if (rustcProbe.error || rustcProbe.status !== 0) {
  const detail = (rustcProbe.error?.message ?? rustcProbe.stderr ?? "").trim().split(/\r?\n/)[0];
  fail("Rust 工具链不可用：rustc -vV 失败（" + detail + "）。\n修复：rustup toolchain install stable");
}

step("构建 " + PROFILE + "（identifier 沿用 app.teague.codev）...");
const buildArgs = [path.join(repoRoot, "scripts/with-cargo-cache.mjs"), "tauri", "build", "--no-bundle"];
if (PROFILE === "debug") buildArgs.push("--debug");
if (runInherit(process.execPath, buildArgs) !== 0) {
  fail("构建失败，未改动 " + target + "（当前版本继续可用）。");
}

const targetDir = resolveCargoTargetDir();
const builtExe = path.join(targetDir, PROFILE, IS_WINDOWS ? "codev.exe" : "codev");
if (!existsSync(builtExe)) fail("构建成功但找不到产物：" + builtExe);

const backup = target + ".old";
const running = runningInstances(target);

if (running.length && FLAGS.has("--restart")) {
  step("结束正在运行的 Codev（PID " + running.map((item) => item.pid).join("、") + "）...");
  stopInstances(running);
}

if (existsSync(backup)) {
  try {
    rmSync(backup, { force: true });
  } catch {
    // 上一版仍被占用，留到下次清理。
  }
}

// 运行中的可执行文件不能覆盖但可以改名：当前窗口继续跑旧镜像，下次启动即新版。
if (runningInstances(target).length) {
  try {
    renameSync(target, backup);
    step("Codev 正在运行：旧文件已改名为 " + path.basename(backup) + "，当前窗口还是旧构建。");
  } catch (error) {
    fail(
      "无法替换正在运行的 " + target + "（" + error.message + "）。\n"
        + "关闭 Codev 窗口后重新运行，或加 --restart 让脚本自己重启它。",
    );
  }
}

try {
  copyFileSync(builtExe, target);
} catch (error) {
  fail("写入 " + target + " 失败：" + error.message + "\n关闭 Codev 窗口后重试。");
}
try {
  rmSync(backup, { force: true });
} catch {
  // 旧镜像仍在运行，下次替换时会清理；它不会影响下次启动。
}

const stillRunning = runningInstances(target);
if (stillRunning.length) {
  step("已替换为 " + gitInfo() + "；关掉当前窗口再打开就是新版，或加 --restart 让脚本重启它。");
} else if (FLAGS.has("--no-launch")) {
  step("已替换为 " + gitInfo() + "，未打开窗口：" + target);
} else {
  step("已替换为 " + gitInfo() + "，启动 " + target);
  spawn(target, [], { cwd: path.dirname(target), detached: true, stdio: "ignore" }).unref();
}

step(PROFILE + " · " + target);

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { repoRoot, resolveCargoTargetDir } from "./lib/cargo-target-dir.mjs";

const [tool, ...args] = process.argv.slice(2);
if (tool !== "tauri" && tool !== "cargo") {
  throw new Error("Usage: with-cargo-cache.mjs <tauri|cargo> [args...]");
}

const target = resolveCargoTargetDir();
const env = { ...process.env, CARGO_TARGET_DIR: target };
const configDir = path.join(repoRoot, "src-tauri", ".cargo");
mkdirSync(configDir, { recursive: true });
writeFileSync(
  path.join(configDir, "config.toml"),
  "# 本机自动生成，不进 Git。由 scripts/with-cargo-cache.mjs 自动解析缓存目录。\n[build]\ntarget-dir = " + JSON.stringify(target) + "\n",
);
console.log("[Codev] CARGO_TARGET_DIR=" + target);

const require = createRequire(import.meta.url);
const command = tool === "tauri" ? process.execPath : process.platform === "win32" ? "cargo.exe" : "cargo";
const commandArgs = tool === "tauri"
  ? [path.join(path.dirname(require.resolve("@tauri-apps/cli")), "tauri.js"), ...args]
  : args;
const child = spawn(command, commandArgs, {
  cwd: tool === "cargo" ? path.join(repoRoot, "src-tauri") : repoRoot,
  env,
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

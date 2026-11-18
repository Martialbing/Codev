import { accessSync, constants, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 仓库根目录，scripts/lib/ 的上两级。 */
export const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/** 按当前机器选择可写的仓库外缓存，兼容不同用户、盘符和系统。 */
export function resolveCargoTargetDir() {
  const platformCache = process.platform === "win32"
    ? process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
    : process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Caches")
      : process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const candidates = [
    process.env.CODEV_CARGO_TARGET_DIR,
    process.env.CARGO_TARGET_DIR,
    path.join(platformCache, "codev-cargo-target"),
  ];
  for (const candidate of new Set(candidates.filter(Boolean))) {
    const target = path.resolve(candidate);
    const relative = path.relative(repoRoot, target);
    if (!relative || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative))) {
      console.warn("[Codev] 跳过仓库内缓存：" + target);
      continue;
    }
    try {
      mkdirSync(target, { recursive: true });
      accessSync(target, constants.W_OK);
      return target;
    } catch (error) {
      console.warn("[Codev] 缓存不可用，尝试下一路径：" + target + " (" + error.message + ")");
    }
  }
  throw new Error("没有可写的仓库外 Rust 缓存目录。");
}

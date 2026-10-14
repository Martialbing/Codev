import { beforeEach, describe, expect, it, vi } from "vitest";
import { openPath } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import {
  openInDefaultApp,
  rememberFilePreview,
  shouldOpenExternally,
} from "./defaultApp";

vi.mock("@tauri-apps/plugin-opener", () => ({ openPath: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("default application routing", () => {
  it("routes office files and archives, including Windows paths", () => {
    for (const path of [
      "C:\\work\\Report.XLSX",
      "/work/a.docx",
      "/work/a.zip",
      "/work/a.parquet",
    ]) {
      expect(shouldOpenExternally(path)).toBe(true);
    }
  });

  it("preserves internal readers and unknown text extensions", () => {
    for (const path of [
      "a.ts",
      "a.md",
      "a.html",
      "a.csv",
      "a.pdf",
      "a.png",
      "a.bmp",
      "a.avif",
      "a.aac",
      "a.mp4",
      "Dockerfile",
      "a.custom",
      "a.dat",
    ]) {
      expect(shouldOpenExternally(path)).toBe(false);
    }
  });

  it("remembers detected binary content and clears it if the file becomes text", () => {
    const path = "/work/unknown-content";
    rememberFilePreview(path, true);
    expect(shouldOpenExternally(path)).toBe(true);
    rememberFilePreview(path, false);
    expect(shouldOpenExternally(path)).toBe(false);
  });

  it("passes paths literally to the system opener", async () => {
    const path = "C:\\work\\报告 & 汇总.xlsx";
    await openInDefaultApp(path);
    expect(openPath).toHaveBeenCalledWith(path);
  });

  it("reports opener failures without an unhandled rejection", async () => {
    vi.mocked(openPath).mockRejectedValueOnce(
      new Error("No associated application"),
    );
    await expect(openInDefaultApp("a.xlsx")).resolves.toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("No associated application"),
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  changedTreeDirectories,
  closestLoadedTreePath,
  findLoadedTreePath,
  normalizeTreePath,
  parentTreePath,
} from "./treePath";

describe("file tree path alignment", () => {
  it("refreshes a removed expanded directory's parent and deduplicates file events", () => {
    const nodes = {
      "D:/Project": { status: "loaded" },
      "D:/Project/nested": { status: "loaded" },
    };
    expect([
      ...changedTreeDirectories(nodes, ["D:\\Project\\nested"], "D:/Project"),
    ]).toEqual(["D:/Project/nested", "D:/Project"]);
    expect([
      ...changedTreeDirectories(
        nodes,
        ["D:/Project/nested/a.txt", "d:/project/nested/b.txt"],
        "D:/Project",
      ),
    ]).toEqual(["D:/Project/nested"]);
    expect([
      ...changedTreeDirectories(nodes, ["D:/other/a.txt"], "D:/Project"),
    ]).toEqual([]);
  });

  it("normalizes slashes, verbatim prefixes, and Windows case", () => {
    expect(normalizeTreePath("C:\\Users\\79988\\Desktop\\")).toBe(
      "c:/users/79988/desktop",
    );
    expect(normalizeTreePath("//?/C:/Users/79988/Desktop/file.txt")).toBe(
      "c:/users/79988/desktop/file.txt",
    );
    expect(normalizeTreePath("/Work/One")).toBe("/Work/One");
  });

  it("keeps the drive root when taking a parent path", () => {
    expect(parentTreePath("C:/Users/79988/Desktop/copy.txt")).toBe(
      "c:/users/79988/desktop",
    );
    expect(parentTreePath("C:/file.txt")).toBe("c:/");
  });

  it("matches loaded parents even when watcher casing differs", () => {
    const nodes = {
      "C:/Users/79988/Desktop": { status: "loaded" },
    };
    expect(findLoadedTreePath(nodes, "c:/users/79988/desktop")).toBe(
      "C:/Users/79988/Desktop",
    );
    expect(
      closestLoadedTreePath(
        nodes,
        "C:\\Users\\79988\\Desktop\\iris-copy.csv",
        "C:/Users/79988/Desktop",
      ),
    ).toBe("C:/Users/79988/Desktop");
  });
});

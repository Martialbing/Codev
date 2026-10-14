import { beforeEach, describe, expect, it } from "vitest";
import {
  applyUnreadStatusChanges,
  hasUnreadTask,
  markTaskRead,
  resetUnreadTasks,
} from "../taskbar-unread/unreadTasks";
import { collectPiUnreadStatusChanges } from "./subagentUnread";

function observer() {
  const previous = new Map<string, string>();
  const parents = new Set<string>();
  return (
    subagents?: { runId: string; status: string }[],
    path = "C:/sessions/parent.jsonl",
    key?: string,
  ) =>
    collectPiUnreadStatusChanges(previous, parents, [
      { key: key ?? path, path, subagents },
    ]);
}
const child = (status: string, runId = "child") => ({ runId, status });

beforeEach(() => resetUnreadTasks());

describe("Pi subagent history baseline", () => {
  it("does not announce completed history on startup or delayed load", () => {
    const observe = observer();
    observe();
    observe();
    expect(observe([child("complete")]).completed).toEqual([]);
    expect(observe([child("complete")]).completed).toEqual([]);
  });

  it("still announces running-to-complete transitions", () => {
    const observe = observer();
    expect(observe([child("running")]).running).toEqual(["pi:child"]);
    expect(observe([child("complete")]).completed).toEqual(["pi:child"]);
    expect(observe([child("complete")]).completed).toEqual([]);
  });

  it("announces a fast task first seen complete after an empty baseline", () => {
    const observe = observer();
    observe([]);
    expect(observe([child("complete")]).completed).toEqual(["pi:child"]);
  });

  it("seeds each parent independently when switching projects", () => {
    const observe = observer();
    observe([]);
    expect(
      observe([child("complete")], "C:/other/parent.jsonl").completed,
    ).toEqual([]);
    expect(observe([child("complete", "new")]).completed).toEqual(["pi:new"]);
  });

  it("uses the session path when the runtime thread key changes", () => {
    const observe = observer();
    observe([], "C:/sessions/parent.jsonl", "runtime-1");
    expect(
      observe([child("complete")], "c:\\sessions\\parent.jsonl", "runtime-2")
        .completed,
    ).toEqual(["pi:child"]);
  });

  it("does not resurrect a cleared blue dot on remount or restart", () => {
    const observe = observer();
    observe([]);
    applyUnreadStatusChanges(observe([child("complete")]));
    expect(hasUnreadTask("pi:child")).toBe(true);
    markTaskRead("pi:child");
    applyUnreadStatusChanges(observer()([child("complete")]));
    expect(hasUnreadTask("pi:child")).toBe(false);
    resetUnreadTasks();
    applyUnreadStatusChanges(observer()([child("complete")]));
    expect(hasUnreadTask("pi:child")).toBe(false);
  });

  it("does not clear an existing unread completion when restoring the sidebar", () => {
    const observe = observer();
    observe([]);
    applyUnreadStatusChanges(observe([child("complete")]));
    applyUnreadStatusChanges(observer()([child("complete")]));
    expect(hasUnreadTask("pi:child")).toBe(true);
  });
});

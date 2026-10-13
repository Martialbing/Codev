import { describe, expect, it } from "vitest";
import {
  clearViewportSlot,
  closeViewportSlot,
  focusAfterViewportChange,
  growViewportSlots,
  shrinkViewportSlots,
} from "./viewportSlots";

describe("viewport slots", () => {
  it("clears a slot without changing length", () => {
    expect(clearViewportSlot(["a", "b", "c"], 1, null)).toEqual([
      "a",
      null,
      "c",
    ]);
  });

  it("closes a middle slot and shifts the rest", () => {
    expect(closeViewportSlot(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("closes the last remaining viewport instead of keeping an empty slot", () => {
    expect(closeViewportSlot(["a"], 0)).toEqual([]);
  });

  it("shrinks to a single viewport and then no-ops", () => {
    expect(shrinkViewportSlots(["a", "b"])).toEqual(["a"]);
    expect(shrinkViewportSlots(["a"])).toEqual(["a"]);
  });

  it("grows at the end until the cap", () => {
    expect(growViewportSlots(["a"], null, 2)).toEqual(["a", null]);
    expect(growViewportSlots(["a", null], null, 2)).toEqual(["a", null]);
  });

  it("moves focus onto a remaining slot after close", () => {
    expect(focusAfterViewportChange(2, 0, 2)).toBe(1);
    expect(focusAfterViewportChange(0, 0, 1)).toBe(0);
    expect(focusAfterViewportChange(1, 1, 1)).toBe(0);
  });
});

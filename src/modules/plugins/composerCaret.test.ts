import { describe, expect, it } from "vitest";
import { clampComposerHeight, COMPOSER_MIN_HEIGHT } from "./composerCaret";

describe("composer height", () => {
  it("does not shrink below the empty composer", () => {
    expect(clampComposerHeight(20, 480)).toBe(COMPOSER_MIN_HEIGHT);
  });

  it("does not grow past the window cap", () => {
    expect(clampComposerHeight(900, 400)).toBe(400);
  });

  it("keeps a dragged height between the bounds", () => {
    expect(clampComposerHeight(240, 480)).toBe(240);
  });
});

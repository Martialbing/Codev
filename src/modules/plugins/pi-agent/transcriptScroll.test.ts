import { describe, expect, it } from "vitest";
import {
  followAfterScroll,
  isNearBottom,
  readingBlockIndex,
  readingMeasurements,
} from "./transcriptScroll";
import type { PiTimelineBlock } from "./timeline";
const message = (id: string): PiTimelineBlock => ({
  id,
  kind: "item",
  item: {
    id,
    kind: "message",
    role: "assistant",
    text: id,
    thinking: "",
    streaming: false,
  },
});

describe("follow after scroll", () => {
  it("resumes when the user is back at the bottom", () => {
    expect(followAfterScroll(true, true, false)).toBe(true);
  });
  it("pauses only while the user is scrolling away", () => {
    expect(followAfterScroll(false, true, true)).toBe(false);
  });
  it("keeps live follow across programmatic growth", () => {
    expect(followAfterScroll(false, false, true)).toBe(true);
  });
});

describe("near bottom", () => {
  it("treats slack as already pinned", () => {
    expect(
      isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 580 }),
    ).toBe(true);
  });
  it("does not pin when the reader has left the bottom", () => {
    expect(
      isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 200 }),
    ).toBe(false);
  });
});

describe("Pi reading anchor", () => {
  it("follows the message when streaming text moves out of a process block", () => {
    const blocks = [message("older"), message("answer")];
    expect(
      readingBlockIndex(blocks, {
        top: 900,
        follow: false,
        anchor: { blockId: "process-answer", itemId: "answer", offset: 80 },
      }),
    ).toBe(1);
  });
  it("resolves an unchanged anchor after history is prepended", () => {
    expect(
      readingBlockIndex([message("new-page"), message("old-page")], {
        top: 0,
        follow: false,
        anchor: { blockId: "old-page", offset: 10 },
      }),
    ).toBe(1);
  });
  it("falls back to the parent block if the inner message disappears", () => {
    expect(
      readingBlockIndex([message("parent")], {
        top: 400,
        follow: false,
        anchor: { blockId: "parent", itemId: "missing", offset: 10 },
      }),
    ).toBe(0);
  });
  it("uses raw offset fallback only if no identity survives", () => {
    expect(
      readingBlockIndex([message("other")], {
        top: 400,
        follow: false,
        anchor: { blockId: "missing", offset: 10 },
      }),
    ).toBe(-1);
  });
  it("remaps measured heights by key without reusing old indices", () => {
    const measurements = readingMeasurements(
      [message("prepend"), message("b"), message("a")],
      {
        top: 700,
        follow: false,
        measurements: [
          { key: "a", index: 0, start: 0, end: 700, size: 700, lane: 0 },
          { key: "b", index: 1, start: 700, end: 760, size: 60, lane: 0 },
        ],
      },
    );
    expect(
      measurements.map(({ key, index, start, size }) => ({
        key,
        index,
        start,
        size,
      })),
    ).toEqual([
      { key: "b", index: 1, start: 110, size: 60 },
      { key: "a", index: 2, start: 170, size: 700 },
    ]);
  });
});

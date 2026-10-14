import { createContext, useCallback, useContext, useReducer } from "react";
import type { VirtualItem } from "@tanstack/react-virtual";
import type { PiTimelineBlock } from "./timeline";

export type PiReadingPosition = {
  top: number;
  follow: boolean;
  anchor?: {
    blockId: string;
    itemId?: string;
    offset: number;
    itemOffset?: number;
  };
};

export type PiScrollMemory = PiReadingPosition & {
  width?: number;
  measurements?: VirtualItem[];
  expanded?: Map<string, boolean>;
};

/** 贴底则跟随；只有用户正在滚动且离开底部才暂停，程序滚动不能改跟随。 */
export function followAfterScroll(
  atBottom: boolean,
  userScrolling: boolean,
  follow: boolean,
) {
  if (atBottom) return true;
  if (userScrolling) return false;
  return follow;
}

/** Resolve by message identity as a streaming message can move out of its process block. */
export function readingBlockIndex(
  blocks: PiTimelineBlock[],
  position: PiReadingPosition,
) {
  const anchor = position.anchor;
  if (!anchor) return -1;
  if (anchor.itemId) {
    const index = blocks.findIndex((block) =>
      block.kind === "item"
        ? block.item.id === anchor.itemId
        : block.items.some((item) => item.id === anchor.itemId),
    );
    if (index >= 0) return index;
  }
  return blocks.findIndex((block) => block.id === anchor.blockId);
}

/** Remap cached sizes by stable key after history prepend or streaming block changes. */
export function readingMeasurements(
  blocks: PiTimelineBlock[],
  memory?: PiScrollMemory,
) {
  const sizes = new Map(
    memory?.measurements?.map((item) => [item.key, item.size]),
  );
  let start = 0;
  return blocks.flatMap((block, index) => {
    const size = sizes.get(block.id);
    const item = {
      key: block.id,
      index,
      start,
      size: size ?? 110,
      end: start + (size ?? 110),
      lane: 0,
    };
    start = item.end;
    return size === undefined ? [] : [item];
  });
}

export const PiExpansionContext = createContext<Map<string, boolean> | null>(
  null,
);

/** User overrides survive virtual row unmounts; untouched processes still follow running state. */
export function usePiExpansion(id: string, defaultValue = false) {
  const memory = useContext(PiExpansionContext);
  const [, update] = useReducer((value: number) => value + 1, 0);
  const expanded = memory?.get(id) ?? defaultValue;
  const setExpanded = useCallback(
    (next: boolean | ((previous: boolean) => boolean)) => {
      const previous = memory?.get(id) ?? defaultValue;
      const value = typeof next === "function" ? next(previous) : next;
      memory?.set(id, value);
      update();
    },
    [memory, id, defaultValue],
  );
  return [expanded, setExpanded] as const;
}

export const MAX_VIEWPORTS = 6;

/** 卸掉该格内容，格子数量不变。 */
export function clearViewportSlot<T>(slots: T[], index: number, empty: T): T[] {
  if (index < 0 || index >= slots.length) return slots;
  return slots.map((slot, position) => (position === index ? empty : slot));
}

/** 删掉这一格并前移后续格子；只剩一格时改成空格，避免掉到 0。 */
export function closeViewportSlot<T>(slots: T[], index: number, empty: T): T[] {
  if (index < 0 || index >= slots.length) return slots;
  if (slots.length <= 1) return [empty];
  return slots.filter((_, position) => position !== index);
}

/** 去掉最后一个格子，可减到 1。 */
export function shrinkViewportSlots<T>(slots: T[]): T[] {
  return slots.length <= 1 ? slots : slots.slice(0, -1);
}

/** 末尾追加一个空格，最多 max 个。 */
export function growViewportSlots<T>(
  slots: T[],
  empty: T,
  max = MAX_VIEWPORTS,
): T[] {
  return slots.length >= max ? slots : [...slots, empty];
}

/** 关闭或减少格子后，把焦点收进仍存在的格子。 */
export function focusAfterViewportChange(
  current: number,
  removed: number,
  nextCount: number,
): number {
  const last = Math.max(0, nextCount - 1);
  if (current > removed) return Math.min(current - 1, last);
  return Math.min(current, last);
}

import type { PiTranscriptItem } from "./types";

export const INLINE_THINKING_SUFFIX = ":inline-thinking";
const OPEN = "<think>";
const CLOSE = "</think>";

/** 暂存流末尾尚未收齐的结束标签，避免把标签碎片画进思考正文。 */
function withoutPartialClose(text: string): string {
  for (let size = Math.min(text.length, CLOSE.length - 1); size > 0; size--) {
    if (CLOSE.startsWith(text.slice(-size).toLowerCase()))
      return text.slice(0, -size);
  }
  return text;
}

/** 仅供新收到的 assistant 消息使用；不改 JSONL 或历史加载路径。 */
export function splitLiveThinking(item: PiTranscriptItem): PiTranscriptItem[] {
  if (item.kind !== "message" || item.role !== "assistant") return [item];
  const sourceText = item.sourceText ?? item.text;
  const text = sourceText.trimStart();
  const lower = text.toLowerCase();
  if (!lower.startsWith(OPEN)) {
    // 标签可能跨多个 delta；确认是普通正文后，原样释放暂存内容。
    if (item.streaming && OPEN.startsWith(lower))
      return [{ ...item, sourceText, text: "" }];
    return [item];
  }
  const end = lower.indexOf(CLOSE, OPEN.length);
  const thinking =
    end < 0 ? text.slice(OPEN.length) : text.slice(OPEN.length, end);
  return [
    {
      id: `${item.id}${INLINE_THINKING_SUFFIX}`,
      kind: "thinking",
      text:
        item.streaming && end < 0 ? withoutPartialClose(thinking) : thinking,
      streaming: item.streaming,
      timestamp: item.timestamp,
      activityOrder: item.activityOrder,
    },
    {
      ...item,
      sourceText,
      text: end < 0 ? "" : text.slice(end + CLOSE.length).trimStart(),
    },
  ];
}

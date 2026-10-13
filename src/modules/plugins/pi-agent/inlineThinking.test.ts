import { describe, expect, it } from "vitest";
import { INITIAL_PI_VIEW_STATE, piViewReducer } from "./reducer";
import type { PiViewState } from "./types";

const raw = "<think>内部分析</think>\n正式回复";
const assistant = (text: string) => ({
  role: "assistant",
  timestamp: 1700000001000,
  stopReason: "stop",
  content: [{ type: "text", text }],
});
const event = (state: PiViewState, value: Record<string, unknown>) =>
  piViewReducer(state, {
    type: "event",
    payload: { sessionId: 1, stream: "stdout", event: value },
  });
const delta = (state: PiViewState, text: string, contentIndex = 0) =>
  event(state, {
    type: "message_update",
    assistantMessageEvent: { type: "text_delta", contentIndex, delta: text },
  });

describe("live inline thinking", () => {
  it("buffers split tags and never exposes reasoning as assistant text", () => {
    let state = INITIAL_PI_VIEW_STATE;
    for (const char of `  ${raw}`) {
      state = delta(state, char);
      const text = state.items
        .filter((item) => item.kind === "message")
        .map((item) => item.text)
        .join("");
      expect(text).not.toContain("内部");
      expect(text).not.toContain("<");
      expect(state.items.length).toBeLessThanOrEqual(2);
    }
    const ids = state.items.map((item) => item.id);
    expect(state.items).toMatchObject([
      { kind: "thinking", text: "内部分析", streaming: true },
      { kind: "message", text: "正式回复", sourceText: `  ${raw}` },
    ]);
    state = event(state, {
      type: "message_end",
      message: assistant(`  ${raw}`),
    });
    expect(state.items.map((item) => item.id)).toEqual(ids);
    expect(state.items).toMatchObject([
      { kind: "thinking", text: "内部分析", streaming: false },
      {
        kind: "message",
        text: "正式回复",
        streaming: false,
        sourceText: `  ${raw}`,
        sourceTimestamp: 1700000001000,
        contentIndex: 0,
        stopReason: "stop",
      },
    ]);
  });

  it("also splits a final snapshot without deltas and preserves tools", () => {
    const state = event(INITIAL_PI_VIEW_STATE, {
      type: "message_end",
      message: {
        ...assistant(raw),
        content: [
          { type: "thinking", thinking: "原生思考" },
          { type: "text", text: raw },
          { type: "toolCall", id: "read-1", name: "read", arguments: {} },
        ],
      },
    });
    expect(state.items.map((item) => item.kind)).toEqual([
      "thinking",
      "thinking",
      "message",
      "tool",
    ]);
    expect(state.items[2]).toMatchObject({ contentIndex: 1, text: "正式回复" });
    const next = delta(state, "下一条消息");
    expect(next.items[next.items.length - 1]).toMatchObject({
      kind: "message",
      text: "下一条消息",
    });
  });

  it("keeps an unclosed thinking block folded when interrupted", () => {
    let state = delta(INITIAL_PI_VIEW_STATE, "<think>未完成分析</thi");
    expect(state.items[0]).toMatchObject({
      kind: "thinking",
      text: "未完成分析",
    });
    state = event(state, {
      type: "message_end",
      message: { ...assistant("<think>未完成分析"), stopReason: "aborted" },
    });
    expect(state.items).toMatchObject([
      { kind: "thinking", text: "未完成分析", streaming: false },
      { kind: "message", text: "", stopReason: "aborted" },
    ]);
  });

  it.each([
    "普通正文",
    "<table>表格</table>",
    "<thinking>示例</thinking>",
    "```xml\n<think>示例</think>\n```",
    "示例：<think>保留</think>",
    "> <think>引用</think>",
  ])("preserves ordinary text and literal examples: %s", (text) => {
    let state = INITIAL_PI_VIEW_STATE;
    for (const char of text) state = delta(state, char);
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ kind: "message", text });
  });

  it("releases an unfinished opening tag if the final reply is literal text", () => {
    let state = delta(INITIAL_PI_VIEW_STATE, "<thi");
    expect(state.items[0]).toMatchObject({ text: "" });
    state = event(state, { type: "message_end", message: assistant("<thi") });
    expect(state.items).toMatchObject([{ kind: "message", text: "<thi" }]);
  });

  it("does not transform disk history, RPC history, users or tool results", () => {
    const disk = piViewReducer(INITIAL_PI_VIEW_STATE, {
      type: "history",
      messages: [assistant(raw)],
      offset: 0,
      hasMore: false,
    });
    const rpc = event(INITIAL_PI_VIEW_STATE, {
      type: "response",
      command: "get_messages",
      success: true,
      data: { messages: [assistant(raw)] },
    });
    for (const state of [disk, rpc]) {
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject({ kind: "message", text: raw });
    }
    const user = event(INITIAL_PI_VIEW_STATE, {
      type: "message_end",
      message: { role: "user", content: raw },
    });
    expect(user.items[0]).toMatchObject({ role: "user", text: raw });
    const tool = event(INITIAL_PI_VIEW_STATE, {
      type: "message_end",
      message: {
        role: "toolResult",
        toolCallId: "read-1",
        toolName: "read",
        content: [{ type: "text", text: raw }],
      },
    });
    expect(tool.items[0]).toMatchObject({ kind: "tool", output: raw });
  });
});

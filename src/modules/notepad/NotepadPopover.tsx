import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Cancel01Icon,
  CheckListIcon,
  DragDropVerticalIcon,
  HelpCircleIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uiState } from "@/lib/uiState";
import { useNotePad } from "./store";
import { useNoteItemReorder, useNoteReorder } from "./useNoteReorder";
import type { NoteItem, NoteListId } from "./types";

const BUBBLE = 28;
const POSITION_KEY = "codev.notepad.bubble";
const PANEL_KEY = "codev.notepad.panel";
const MIN_PANEL_WIDTH = 240;
const MIN_PANEL_HEIGHT = 180;
const NOTE_LINE = 22;
const NOTE_MAX_INPUT = 160;

type PanelBox = { x: number; y: number; w: number; h: number };
type Edge = "n" | "s" | "e" | "w";

function growTextarea(
  node: HTMLTextAreaElement,
  min = NOTE_LINE,
  max = NOTE_MAX_INPUT,
) {
  node.style.height = `${min}px`;
  node.style.overflowY = "hidden";
  const next = node.value ? node.scrollHeight : min;
  node.style.height = `${Math.min(max, Math.max(min, next))}px`;
  node.style.overflowY = next > max ? "auto" : "hidden";
}

function insertLineBreak(node: HTMLTextAreaElement) {
  const start = node.selectionStart;
  const end = node.selectionEnd;
  const next = `${node.value.slice(0, start)}\n${node.value.slice(end)}`;
  const caret = start + 1;
  node.value = next;
  node.setSelectionRange(caret, caret);
  growTextarea(node);
  return next;
}

function NoteInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  inputRef,
  singleLine = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  singleLine?: boolean;
}) {
  const local = useRef<HTMLTextAreaElement>(null);
  const setRef = (node: HTMLTextAreaElement | null) => {
    local.current = node;
    if (inputRef) inputRef.current = node;
  };
  useLayoutEffect(() => {
    if (local.current)
      growTextarea(
        local.current,
        NOTE_LINE,
        singleLine ? NOTE_LINE : NOTE_MAX_INPUT,
      );
  }, [value, singleLine]);
  useLayoutEffect(() => {
    const node = local.current;
    if (!node) return;
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth === width) return;
      width = node.clientWidth;
      growTextarea(node, NOTE_LINE, singleLine ? NOTE_LINE : NOTE_MAX_INPUT);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [singleLine]);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      onChange(insertLineBreak(event.currentTarget));
      return;
    }
    onSubmit();
  };
  return (
    <textarea
      ref={setRef}
      value={value}
      rows={1}
      aria-label={placeholder ?? "待办内容"}
      placeholder={placeholder}
      className="block h-[22px] min-h-[22px] w-full resize-none overflow-hidden bg-transparent p-0 text-[11px] leading-[22px] outline-none [overflow-wrap:anywhere] placeholder:text-muted-foreground/70"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

function NoteRow({
  item,
  index,
  listId,
  focus,
}: {
  item: NoteItem;
  index: number;
  listId: NoteListId;
  focus?: boolean;
}) {
  const moveNoteItem = useNotePad((state) => state.moveNoteItem);
  const handle = useNoteItemReorder(listId, moveNoteItem);
  const setItemText = useNotePad((state) => state.setItemText);
  const toggleItem = useNotePad((state) => state.toggleItem);
  const removeItem = useNotePad((state) => state.removeItem);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focus) setEditing(true);
  }, [focus]);
  useEffect(() => {
    if (editing) input.current?.focus({ preventScroll: true });
  }, [editing]);
  return (
    <div
      data-note-item=""
      className={`group flex min-w-0 items-center gap-1 rounded-sm px-1 hover:bg-muted/50 ${editing ? "py-1" : "h-7"}`}
    >
      <button
        type="button"
        aria-label="拖拽排序"
        title="拖拽排序"
        className="flex size-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/70 hover:text-foreground"
        {...handle(index)}
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} size={12} />
      </button>
      <button
        type="button"
        aria-label={item.done ? "标记未完成" : "标记完成"}
        className={`flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border ${item.done ? "border-muted-foreground/70" : "border-muted-foreground/40"}`}
        onClick={() => toggleItem(item.id)}
      >
        {item.done && (
          <span className="block size-1.5 rounded-[1px] bg-muted-foreground/80" />
        )}
      </button>
      {editing ? (
        <div className="min-w-0 flex-1 rounded-md border border-border bg-background/40 px-1.5 py-0.5">
          <NoteInput
            value={item.text}
            inputRef={input}
            placeholder="待办"
            onChange={(text) => setItemText(item.id, text)}
            onSubmit={() => setEditing(false)}
          />
        </div>
      ) : (
        <Tooltip delayDuration={280}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="编辑待办内容"
              onClick={() => setEditing(true)}
              className={`h-5 min-w-0 flex-1 truncate text-left text-[11px] leading-5 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
            >
              {item.text.replace(/\s*\n\s*/g, " · ") || "待办"}
            </button>
          </TooltipTrigger>
          {item.text ? (
            <TooltipContent
              side="bottom"
              align="start"
              sideOffset={6}
              collisionPadding={12}
              data-note-preview=""
              className="z-[100] inline-block w-max max-w-[min(28rem,calc(100vw-24px))] rounded-md border border-border bg-popover px-2.5 py-2 text-left text-[12px] leading-relaxed whitespace-pre-wrap text-popover-foreground shadow-md [overflow-wrap:anywhere]"
            >
              {item.text}
            </TooltipContent>
          ) : null}
        </Tooltip>
      )}
      <button
        type="button"
        aria-label="删除待办"
        className="flex size-5 shrink-0 items-center justify-center text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
        onClick={() => removeItem(item.id)}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={11} />
      </button>
    </div>
  );
}

function ProjectBlock({
  id,
  name,
  items,
  index,
  focusId,
  locked,
}: {
  id: string;
  name: string;
  items: NoteItem[];
  index: number;
  focusId: string | null;
  locked?: boolean;
}) {
  const reorderProject = useNotePad((state) => state.reorderProject);
  const handle = useNoteReorder(reorderProject);
  const addProjectItem = useNotePad((state) => state.addProjectItem);
  const renameProject = useNotePad((state) => state.renameProject);
  const removeProject = useNotePad((state) => state.removeProject);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = () => {
    const title = draft.trim();
    if (title) renameProject(id, title);
    else setDraft(name);
  };
  return (
    <section data-note-project="" className="pt-1">
      <div className="group flex h-7 items-center gap-1 px-1">
        <button
          type="button"
          aria-label="拖拽项目"
          title="拖拽项目"
          className="flex size-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/70 hover:text-foreground"
          {...handle(index)}
        >
          <HugeiconsIcon icon={DragDropVerticalIcon} size={12} />
        </button>
        {locked ? (
          <span className="h-6 min-w-0 flex-1 truncate text-[11px] font-medium leading-6">
            {name}
          </span>
        ) : (
          <input
            value={draft}
            aria-label="项目名"
            className="h-6 min-w-0 flex-1 bg-transparent text-[11px] font-medium outline-none"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setDraft(name);
                event.currentTarget.blur();
              }
            }}
          />
        )}
        <button
          type="button"
          aria-label="新增项目待办"
          className="flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => {
            const next = addProjectItem(id);
            if (next)
              window.dispatchEvent(
                new CustomEvent("codev-note-focus", { detail: next }),
              );
          }}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={11} />
        </button>
        {!locked && (
          <button
            type="button"
            aria-label="删除项目"
            className="flex size-5 items-center justify-center text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
            onClick={() => removeProject(id)}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={11} />
          </button>
        )}
      </div>
      <div data-note-list={id} className="pl-4">
        {items.map((item, itemIndex) => (
          <NoteRow
            key={item.id}
            item={item}
            index={itemIndex}
            listId={id}
            focus={focusId === item.id}
          />
        ))}
      </div>
    </section>
  );
}

function readBubble() {
  try {
    const saved = JSON.parse(uiState.getItem(POSITION_KEY) ?? "null") as {
      x?: number;
      y?: number;
    } | null;
    if (typeof saved?.x === "number" && typeof saved?.y === "number") {
      return { x: saved.x, y: saved.y };
    }
  } catch {
    /* 首次使用放在右下角附近。 */
  }
  return {
    x: Math.max(16, window.innerWidth - 72),
    y: Math.max(72, window.innerHeight - 96),
  };
}

function clampBubble(x: number, y: number) {
  return {
    x: Math.max(8, Math.min(x, window.innerWidth - BUBBLE - 8)),
    y: Math.max(40, Math.min(y, window.innerHeight - BUBBLE - 8)),
  };
}

function defaultPanel(bubble: { x: number; y: number }): PanelBox {
  const w = 288;
  const h = 240;
  return {
    x: Math.max(8, bubble.x + BUBBLE - w),
    y: bubble.y + BUBBLE + 8,
    w,
    h,
  };
}

function readPanel(bubble: { x: number; y: number }): PanelBox {
  try {
    const saved = JSON.parse(
      uiState.getItem(PANEL_KEY) ?? "null",
    ) as Partial<PanelBox> | null;
    if (
      typeof saved?.x === "number" &&
      typeof saved?.y === "number" &&
      typeof saved?.w === "number" &&
      typeof saved?.h === "number"
    ) {
      return clampPanel({ x: saved.x, y: saved.y, w: saved.w, h: saved.h });
    }
  } catch {
    /* 首次打开用默认尺寸。 */
  }
  return clampPanel(defaultPanel(bubble));
}

function clampPanel(box: PanelBox): PanelBox {
  const w = Math.min(
    window.innerWidth - 16,
    Math.max(MIN_PANEL_WIDTH, Math.round(box.w)),
  );
  const h = Math.min(
    window.innerHeight - 24,
    Math.max(MIN_PANEL_HEIGHT, Math.round(box.h)),
  );
  return {
    w,
    h,
    x: Math.max(8, Math.min(box.x, window.innerWidth - w - 8)),
    y: Math.max(8, Math.min(box.y, window.innerHeight - h - 8)),
  };
}

function resizePanel(origin: PanelBox, edge: Edge, dx: number, dy: number) {
  const next = { ...origin };
  if (edge === "e") next.w = origin.w + dx;
  if (edge === "w") {
    next.x = origin.x + dx;
    next.w = origin.w - dx;
  }
  if (edge === "s") next.h = origin.h + dy;
  if (edge === "n") {
    next.y = origin.y + dy;
    next.h = origin.h - dy;
  }
  return clampPanel(next);
}

export function NotepadPopover() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [position, setPosition] = useState(readBubble);
  const [panel, setPanel] = useState(() => readPanel(readBubble()));
  const root = useRef<HTMLDivElement>(null);
  const panelElement = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const edgeDrag = useRef<{
    pointerId: number;
    edge: Edge;
    origin: PanelBox;
    startX: number;
    startY: number;
  } | null>(null);
  const load = useNotePad((state) => state.load);
  const projects = useNotePad((state) => state.projects);
  const addInbox = useNotePad((state) => state.addInbox);
  const addProject = useNotePad((state) => state.addProject);
  const remaining = projects.reduce(
    (sum, project) => sum + project.items.filter((item) => !item.done).length,
    0,
  );

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const onFocus = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id) setFocusId(id);
    };
    window.addEventListener("codev-note-focus", onFocus);
    return () => window.removeEventListener("codev-note-focus", onFocus);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (target.closest?.("[data-note-preview], [data-note-panel]")) return;
      if (!root.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => {
    const onResize = () => {
      setPosition((current) => clampBubble(current.x, current.y));
      setPanel((current) => clampPanel(current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persistPanel = (next: PanelBox) => {
    const box = clampPanel(next);
    setPanel(box);
    uiState.setItem(PANEL_KEY, JSON.stringify(box));
  };

  const startEdgeDrag = (
    edge: Edge,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = panelElement.current?.getBoundingClientRect();
    edgeDrag.current = {
      pointerId: event.pointerId,
      edge,
      origin: bounds
        ? { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height }
        : { ...panel },
      startX: event.clientX,
      startY: event.clientY,
    };
  };
  const onEdgeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = edgeDrag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    persistPanel(
      resizePanel(
        current.origin,
        current.edge,
        event.clientX - current.startX,
        event.clientY - current.startY,
      ),
    );
  };
  const stopEdge = () => {
    edgeDrag.current = null;
  };

  const submitInbox = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addInbox(text);
    setDraft("");
  };

  const edgeClass = (cursor: string, extra: string) =>
    `pointer-events-auto absolute z-10 border-0 bg-transparent p-0 ${cursor} ${extra}`;

  return (
    <>
      <div
        ref={root}
        className="pointer-events-none fixed z-[80]"
        style={{ left: position.x, top: position.y }}
      >
        <button
          type="button"
          aria-label="记事本"
          title="记事本"
          aria-expanded={open}
          className="pointer-events-auto relative flex size-7 cursor-grab items-center justify-center rounded-full border border-border/70 bg-popover text-muted-foreground shadow-md hover:text-foreground active:cursor-grabbing"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            drag.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: position.x,
              originY: position.y,
              moved: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            const dx = event.clientX - current.startX;
            const dy = event.clientY - current.startY;
            if (!current.moved && Math.hypot(dx, dy) < 4) return;
            current.moved = true;
            setPosition(
              clampBubble(current.originX + dx, current.originY + dy),
            );
          }}
          onPointerUp={(event) => {
            const current = drag.current;
            if (!current || current.pointerId !== event.pointerId) return;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            if (current.moved) {
              const next = clampBubble(position.x, position.y);
              setPosition(next);
              uiState.setItem(POSITION_KEY, JSON.stringify(next));
            } else {
              setOpen((value) => !value);
            }
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <HugeiconsIcon icon={CheckListIcon} size={14} />
          {remaining > 0 && (
            <span className="absolute -top-1 -right-1 min-w-3 rounded-sm bg-muted px-0.5 text-center text-[9px] leading-3 text-muted-foreground">
              {remaining > 99 ? "99+" : remaining}
            </span>
          )}
        </button>
      </div>
      {open && (
        <div
          ref={panelElement}
          data-note-panel=""
          className="pointer-events-auto fixed z-[80] flex flex-col rounded-md border border-border bg-popover p-2 shadow-md"
          style={{
            left: panel.x,
            top: panel.y,
            width: panel.w,
            // A saved height is a scroll limit, never space to fill with blank rows.
            maxHeight: panel.h,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label="向上拉伸"
            className={edgeClass(
              "cursor-ns-resize",
              "top-0 right-2 left-2 h-1.5",
            )}
            onPointerDown={(event) => startEdgeDrag("n", event)}
            onPointerMove={onEdgeMove}
            onPointerUp={stopEdge}
            onPointerCancel={stopEdge}
          />
          <button
            type="button"
            aria-label="向下拉伸"
            className={edgeClass(
              "cursor-ns-resize",
              "right-2 bottom-0 left-2 h-1.5",
            )}
            onPointerDown={(event) => startEdgeDrag("s", event)}
            onPointerMove={onEdgeMove}
            onPointerUp={stopEdge}
            onPointerCancel={stopEdge}
          />
          <button
            type="button"
            aria-label="向左拉伸"
            className={edgeClass(
              "cursor-ew-resize",
              "top-2 bottom-2 left-0 w-1.5",
            )}
            onPointerDown={(event) => startEdgeDrag("w", event)}
            onPointerMove={onEdgeMove}
            onPointerUp={stopEdge}
            onPointerCancel={stopEdge}
          />
          <button
            type="button"
            aria-label="向右拉伸"
            className={edgeClass(
              "cursor-ew-resize",
              "top-2 right-0 bottom-2 w-1.5",
            )}
            onPointerDown={(event) => startEdgeDrag("e", event)}
            onPointerMove={onEdgeMove}
            onPointerUp={stopEdge}
            onPointerCancel={stopEdge}
          />
          <div className="flex shrink-0 items-center gap-1 pb-1.5">
            <span className="min-w-0 flex-1 truncate px-1 text-[11px] font-medium">
              记事本
            </span>
            <span className="text-[10px] text-muted-foreground">
              {remaining}
            </span>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  aria-label="快捷键"
                >
                  <HugeiconsIcon icon={HelpCircleIcon} size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="end"
                className="z-[100] rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md"
              >
                Enter 提交 · Ctrl+Enter 换行
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-6"
              aria-label="新增项目"
              title="新增项目"
              onClick={() => addProject("新项目")}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={12} />
            </Button>
          </div>
          <div
            className="reader-scrollbar min-h-0 shrink overflow-auto"
            data-note-projects=""
          >
            {projects.map((project, index) => (
              <ProjectBlock
                key={project.id}
                id={project.id}
                name={project.name}
                items={project.items}
                index={index}
                focusId={focusId}
                locked={project.locked}
              />
            ))}
          </div>
          <form
            className="mt-1.5 shrink-0 border-t border-border/60 pt-1.5"
            onSubmit={submitInbox}
          >
            <div className="flex h-[22px] items-center px-1">
              <NoteInput
                singleLine
                value={draft}
                placeholder="添加一次性待办"
                onChange={setDraft}
                onSubmit={() => submitInbox()}
              />
            </div>
          </form>
        </div>
      )}
    </>
  );
}

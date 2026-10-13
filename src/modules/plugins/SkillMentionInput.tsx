import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  type ComponentProps,
  type RefObject,
  type UIEvent,
  useLayoutEffect,
  useRef,
} from "react";
import { skillHighlightSegments, type SkillRef } from "./skillMention";

type Props = Omit<ComponentProps<"textarea">, "value" | "children"> & {
  value: string;
  skills: SkillRef[];
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

const TYPEFACE =
  "whitespace-pre-wrap break-words px-3 py-3 text-[13px]! leading-[1.5] [overflow-wrap:anywhere]";

/** 把高亮层锁到原生输入的可视盒，避免它自己折行或滚动。 */
function syncOverlay(textarea: HTMLTextAreaElement, overlay: HTMLDivElement) {
  const style = getComputedStyle(textarea);
  overlay.style.boxSizing = "border-box";
  overlay.style.font = style.font;
  overlay.style.letterSpacing = style.letterSpacing;
  overlay.style.wordSpacing = style.wordSpacing;
  overlay.style.tabSize = style.getPropertyValue("tab-size");
  overlay.style.whiteSpace = style.whiteSpace;
  overlay.style.wordBreak = style.wordBreak;
  overlay.style.overflowWrap = style.overflowWrap;
  overlay.style.padding = style.padding;
  overlay.style.width = `${textarea.clientWidth}px`;
  overlay.style.height = `${textarea.clientHeight}px`;
  overlay.scrollTop = textarea.scrollTop;
  overlay.scrollLeft = textarea.scrollLeft;
}

/** 输入行只显示 $name，已绑定技能用蓝色底标出，路径不进输入框。 */
export function SkillMentionInput({
  value,
  skills,
  textareaRef,
  className,
  onScroll,
  placeholder,
  ...props
}: Props) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const segments = skillHighlightSegments(value, skills);
  const highlighted = segments.some((part) => part.skill);

  const setTextareaRef = (node: HTMLTextAreaElement | null) => {
    localRef.current = node;
    if (textareaRef) textareaRef.current = node;
  };

  useLayoutEffect(() => {
    const textarea = localRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) return;
    syncOverlay(textarea, overlay);
    const observer = new ResizeObserver(() => {
      const next = overlayRef.current;
      if (next) syncOverlay(textarea, next);
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [highlighted, value]);

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.scrollTop = event.currentTarget.scrollTop;
      overlay.scrollLeft = event.currentTarget.scrollLeft;
    }
    onScroll?.(event);
  };

  return (
    <div className="relative">
      {highlighted ? (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 left-0 overflow-hidden text-transparent",
            TYPEFACE,
          )}
        >
          {segments.map((part, index) =>
            part.skill ? (
              <span key={index} className="rounded-sm bg-sky-500/15">
                {part.text}
              </span>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
          {value.endsWith("\n") ? "\n" : null}
        </div>
      ) : null}
      <Textarea
        {...props}
        ref={setTextareaRef}
        value={value}
        placeholder={placeholder}
        className={cn(
          "relative z-10 min-h-18 max-h-45 bg-transparent! caret-sky-600",
          TYPEFACE,
          className,
        )}
        onScroll={syncScroll}
      />
    </div>
  );
}

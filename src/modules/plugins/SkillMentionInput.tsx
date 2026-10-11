import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import type { ComponentProps, RefObject, UIEvent } from "react";
import { skillHighlightSegments, type SkillRef } from "./skillMention";

type Props = Omit<ComponentProps<"textarea">, "value" | "children"> & {
  value: string;
  skills: SkillRef[];
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

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
  const segments = skillHighlightSegments(value, skills);
  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const overlay = event.currentTarget.previousElementSibling;
    if (overlay instanceof HTMLElement) {
      overlay.scrollTop = event.currentTarget.scrollTop;
      overlay.scrollLeft = event.currentTarget.scrollLeft;
    }
    onScroll?.(event);
  };
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="reader-scrollbar pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-[13px] leading-normal text-foreground"
      >
        {value ? (
          segments.map((part, index) =>
            part.skill ? (
              <span
                key={index}
                className="rounded-sm bg-sky-500/15 font-medium text-sky-600 dark:text-sky-400"
              >
                {part.text}
              </span>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>
      <Textarea
        {...props}
        ref={textareaRef}
        value={value}
        placeholder={placeholder}
        className={cn(
          "relative z-10 min-h-18 max-h-45 bg-transparent! text-transparent caret-sky-600 placeholder:text-transparent",
          className,
        )}
        onScroll={syncScroll}
      />
    </div>
  );
}

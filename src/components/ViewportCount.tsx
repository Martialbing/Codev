import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { MAX_VIEWPORTS } from "@/lib/viewportSlots";

/** 顶栏格子计数：加减略小，中间数字略大。 */
export function ViewportCount({
  count,
  max = MAX_VIEWPORTS,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
}: {
  count: number;
  max?: number;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-4"
        aria-label={minusLabel}
        title={minusLabel}
        disabled={count <= 1}
        onClick={onMinus}
      >
        <HugeiconsIcon icon={MinusSignIcon} size={10} />
      </Button>
      <span className="min-w-7 px-0.5 text-center text-xs leading-none tabular-nums text-muted-foreground">
        {count}/{max}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-4"
        aria-label={plusLabel}
        title={plusLabel}
        disabled={count >= max}
        onClick={onPlus}
      >
        <HugeiconsIcon icon={PlusSignIcon} size={10} />
      </Button>
    </div>
  );
}

/** 格子标题栏：清空卸内容，关闭删格子。 */
export function ViewportSlotActions({
  onClear,
  onClose,
  closeDisabled = false,
}: {
  onClear: () => void;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-5"
        title="清空视口内容"
        aria-label="清空视口内容"
        onClick={onClear}
      >
        <HugeiconsIcon icon={Delete02Icon} size={12} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-5"
        title="关闭格子"
        aria-label="关闭格子"
        disabled={closeDisabled}
        onClick={onClose}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} />
      </Button>
    </>
  );
}

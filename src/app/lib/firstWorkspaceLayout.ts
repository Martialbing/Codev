import { uiState } from "@/lib/uiState";
import { FILE_TREE_ROOTS_KEY } from "@/modules/explorer/lib/rootCollapse";
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from "@/modules/sidebar/useSidebarPanel";
import { TERMINAL_MIN_WIDTH } from "@/modules/terminal/lib/useTerminalPanelLayout";

export const WELCOME_KEY = "codev.welcome.completed";
export const WELCOME_STAMP_KEY = "codev.welcome.stamp";
export const LAYOUT_INITIALIZED_KEY = "codev.layout.initialized";
export const FILE_TREE_EXPANDED_KEY = "codev.file-tree.expanded";
export { FILE_TREE_ROOTS_KEY };
export const SIDEBAR_WIDTH_KEY = SIDEBAR_WIDTH_STORAGE_KEY;
export const SIDEBAR_COLLAPSED_KEY = "codev.sidebar.collapsed";
export const TERMINAL_WIDTH_KEY = "codev.terminal.width";
export const TERMINAL_COLLAPSED_KEY = "codev.terminal.collapsed";
export const FILE_PANEL_WIDTH_KEY = "codev.workspace.file-panel.width";
export const FILE_PANEL_MIN_WIDTH = 220;

type MemoryStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** 为首次进入工作区提供默认的左栏宽度和终端宽度。 */
export function firstLayoutSizes(width: number): {
  sidebar: number;
  terminal: number;
} {
  const usable = Math.max(900, Math.round(width));
  return {
    sidebar: SIDEBAR_DEFAULT_WIDTH,
    terminal: Math.max(TERMINAL_MIN_WIDTH, Math.round(usable / 3)),
  };
}

/** 首次打开文件分屏时默认占据中央区域的一半。 */
export function defaultFilePanelWidth(availableWidth: number): number {
  return Math.max(FILE_PANEL_MIN_WIDTH, Math.round(availableWidth / 2));
}

/** 读取用户手动调整过的文件分屏宽度；默认值不写入布局记忆。 */
export function readFilePanelWidth(
  store: MemoryStore | null = uiState,
): number | null {
  try {
    const stored = store?.getItem(FILE_PANEL_WIDTH_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed)
      ? Math.max(FILE_PANEL_MIN_WIDTH, parsed)
      : null;
  } catch {
    return null;
  }
}

/** 只保存用户拖拽产生的有效文件分屏宽度。 */
export function shouldPersistFilePanelWidth(
  width: number,
  isUserInteraction: boolean,
): boolean {
  return isUserInteraction && width >= FILE_PANEL_MIN_WIDTH;
}

/** 兼容旧版欢迎流程：判断布局是否初始化。 */
export function needsFirstLayout(store: MemoryStore | null = uiState): boolean {
  try {
    return !store || store.getItem(LAYOUT_INITIALIZED_KEY) !== "1";
  } catch {
    return true;
  }
}

/** 仅未完成初始化时显示欢迎页，安装升级不重置已有布局。 */
export function shouldShowWelcome(
  _stamp: string | null,
  store: MemoryStore | null = uiState,
): boolean {
  try {
    if (!store || store.getItem(WELCOME_KEY) !== "1") return true;
    return needsFirstLayout(store);
  } catch {
    return true;
  }
}

/** 写入欢迎完成和首次面板状态，左栏展开、右栏展开。 */
export function completeWelcome(
  stamp: string | null,
  width = 1200,
  store: MemoryStore | null = uiState,
): { sidebar: number; terminal: number } {
  const sizes = firstLayoutSizes(width);
  try {
    store?.setItem(WELCOME_KEY, "1");
    if (stamp) store?.setItem(WELCOME_STAMP_KEY, stamp);
    store?.setItem(LAYOUT_INITIALIZED_KEY, "1");
    store?.setItem(SIDEBAR_COLLAPSED_KEY, "0");
    store?.setItem(TERMINAL_COLLAPSED_KEY, "0");
    store?.setItem(TERMINAL_WIDTH_KEY, String(sizes.terminal));
    store?.setItem(FILE_TREE_EXPANDED_KEY, "{}");
  } catch {
    /* storage unavailable */
  }
  return sizes;
}

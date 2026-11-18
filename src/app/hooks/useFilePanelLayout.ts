import { uiState } from "@/lib/uiState";
import { useCallback, useEffect, useRef } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  defaultFilePanelWidth,
  FILE_PANEL_WIDTH_KEY,
  readFilePanelWidth,
  shouldPersistFilePanelWidth,
} from "../lib/firstWorkspaceLayout";

/** 管理右侧文件分屏：自适应首次默认宽度，只记忆人工拖拽后的宽度。 */
export function useFilePanelLayout(estimatedAvailableWidth: number) {
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const groupElementRef = useRef<HTMLDivElement | null>(null);
  const panelWidthRef = useRef<number | null>(readFilePanelWidth());
  const defaultPanelWidthRef = useRef(
    panelWidthRef.current ?? defaultFilePanelWidth(estimatedAvailableWidth),
  );
  const widthWriteTimerRef = useRef(0);

  const persistPanelWidth = useCallback(
    (width: number, isUserInteraction: boolean) => {
      if (!shouldPersistFilePanelWidth(width, isUserInteraction)) return;
      panelWidthRef.current = width;
      if (widthWriteTimerRef.current) {
        window.clearTimeout(widthWriteTimerRef.current);
      }
      widthWriteTimerRef.current = window.setTimeout(() => {
        widthWriteTimerRef.current = 0;
        try {
          uiState.setItem(FILE_PANEL_WIDTH_KEY, String(width));
        } catch {
          // storage may be unavailable
        }
      }, 200);
    },
    [],
  );

  useEffect(
    () => () => {
      if (widthWriteTimerRef.current) {
        window.clearTimeout(widthWriteTimerRef.current);
      }
    },
    [],
  );

  const openPanel = useCallback(() => {
    const measuredWidth =
      groupElementRef.current?.getBoundingClientRect().width;
    const availableWidth =
      measuredWidth && measuredWidth > 0
        ? measuredWidth
        : estimatedAvailableWidth;
    const width =
      panelWidthRef.current ?? defaultFilePanelWidth(availableWidth);
    defaultPanelWidthRef.current = width;
    requestAnimationFrame(() => panelRef.current?.resize(`${width}px`));
  }, [estimatedAvailableWidth]);

  return {
    panelRef,
    groupElementRef,
    panelWidthRef,
    defaultPanelWidthRef,
    persistPanelWidth,
    openPanel,
  };
}

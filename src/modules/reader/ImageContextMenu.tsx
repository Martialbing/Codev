import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ReactElement } from "react";
import { toast } from "sonner";

/** 将原始图片转为剪贴板通用 PNG，支持 JPEG、WebP、data URL 与本地附件。 */
async function imagePng(src: string): Promise<Blob> {
  // data URL 直接解码 base64，避免 WebView2 fetch 限制
  if (src.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(src);
    if (!match) throw new Error("无效的 data URL");
    const [, mimeType, base64] = match;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    // 已经是 PNG，直接返回
    if (mimeType === "image/png") return blob;
    // 转换为 PNG
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("无法转换图片");
      context.drawImage(bitmap, 0, 0);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("无法转换图片"))),
          "image/png",
        ),
      );
    } finally {
      bitmap.close();
    }
  }
  // 普通 URL 走 fetch 逻辑
  const response = await fetch(src);
  if (!response.ok) throw new Error("无法读取图片");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法转换图片");
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("无法转换图片"))),
        "image/png",
      ),
    );
  } finally {
    bitmap.close();
  }
}

/** 图片右键菜单，复制实际图像而非路径或链接。 */
export function ImageContextMenu({
  src,
  children,
}: {
  src: string;
  children: ReactElement;
}) {
  /** 在点击时提交剪贴板写入，异步准备 PNG 内容并报告失败。 */
  const copy = () => {
    void navigator.clipboard
      .write([new ClipboardItem({ "image/png": imagePng(src) })])
      .catch((error) => toast.error(`复制图片失败：${String(error)}`));
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent style={{ zIndex: 2147483647 }}>
        <ContextMenuItem onSelect={copy}>复制图片</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

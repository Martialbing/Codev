import { openPath } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";

// Text files may use arbitrary extensions; only known non-preview formats are
// routed externally before Codev has inspected their contents.
const externalExtensions = new Set(
  "xlsx xls xlsm xlsb xlt xltx xltm ods doc docx docm dot dotx dotm odt rtf ppt pptx pptm pps ppsx pot potx odp zip rar 7z gz bz2 xz tar tgz zst iso img dmg exe msi dll so dylib bin db sqlite sqlite3 parquet arrow feather pkl pickle npy npz psd ai eps sketch fig tiff tif heic heif avi mkv wmv flv wma epub mobi azw azw3 ttf otf woff woff2".split(
    " ",
  ),
);
const binaryPaths = new Set<string>();

export function shouldOpenExternally(path: string): boolean {
  const name = path.split(/[\\/]/).pop() ?? path;
  const extension = name.includes(".")
    ? name.split(".").pop()?.toLowerCase()
    : "";
  return binaryPaths.has(path) || externalExtensions.has(extension ?? "");
}

/** Record actual file classification, including binary files with no extension. */
export function rememberFilePreview(path: string, binary: boolean): void {
  if (binary) binaryPaths.add(path);
  else binaryPaths.delete(path);
}

export async function openInDefaultApp(path: string): Promise<void> {
  try {
    await openPath(path);
  } catch (error) {
    toast.error(`无法使用默认应用打开：${String(error)}`);
  }
}

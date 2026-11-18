import { Button } from "@/components/ui/button";
import { useSpaces } from "@/modules/spaces";

type Props = {
  activeRoot: string | null;
  workspaceRoots: string[];
  onSetActiveRoot: (path: string) => void;
  onShowFiles: () => void;
};

/** 复用现有 Space 与多根目录状态，先提供轻量的工作区导航。 */
export function WorkspaceSidebar({
  activeRoot,
  workspaceRoots,
  onSetActiveRoot,
  onShowFiles,
}: Props) {
  const spaces = useSpaces((state) => state.spaces);
  const activeId = useSpaces((state) => state.activeId);
  const setActive = useSpaces((state) => state.setActive);
  return (
    <div className="reader-scrollbar h-full overflow-auto p-2">
      <div className="px-2 py-2 text-[10px] font-medium text-muted-foreground">
        工作区目录
      </div>
      {workspaceRoots.map((root) => (
        <Button
          key={root}
          variant={root === activeRoot ? "secondary" : "ghost"}
          size="sm"
          className="mb-1 w-full justify-start truncate rounded-md text-xs"
          title={root}
          onClick={() => onSetActiveRoot(root)}
        >
          <span className="truncate">
            {root.split(/[\\/]/).filter(Boolean).pop() || root}
          </span>
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start rounded-md text-xs text-muted-foreground"
        onClick={onShowFiles}
      >
        管理文件夹
      </Button>
      <div className="mt-4 px-2 py-2 text-[10px] font-medium text-muted-foreground">
        Spaces
      </div>
      {spaces.map((space) => (
        <Button
          key={space.id}
          variant={space.id === activeId ? "secondary" : "ghost"}
          size="sm"
          className="mb-1 w-full justify-start truncate rounded-md text-xs"
          onClick={() => setActive(space.id)}
        >
          <span className="truncate">{space.name}</span>
        </Button>
      ))}
    </div>
  );
}

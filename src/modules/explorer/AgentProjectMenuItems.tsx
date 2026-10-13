import { ContextMenuItem } from "@/components/ui/context-menu";
import { usePluginStore } from "@/modules/plugins/store";
import { requestAgentProject } from "@/modules/plugins/agentProjectRequest";
import { COMPACT_ITEM } from "./lib/menuItemClass";

/** 文件添加其所在目录；始终针对当前右键对象。 */
export function AgentProjectMenuItems({
  cwd,
  isFile = false,
}: {
  cwd: string;
  isFile?: boolean;
}) {
  const enabled = usePluginStore((state) => state.enabled);
  return (
    <>
      {(["pi", "codex"] as const).map((target) => {
        const name = target === "pi" ? "Pi" : "Codex";
        const available = enabled[target === "pi" ? "pi-agent" : "codex-agent"];
        return (
          <ContextMenuItem
            key={target}
            className={COMPACT_ITEM}
            disabled={!available}
            title={
              !available
                ? `请先启用 ${name} 插件`
                : isFile
                  ? `添加文件所在文件夹：${cwd}`
                  : cwd
            }
            onSelect={() => requestAgentProject(target, cwd)}
          >
            添加到 {name} 项目
          </ContextMenuItem>
        );
      })}
    </>
  );
}

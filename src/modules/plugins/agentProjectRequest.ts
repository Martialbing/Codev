import { create } from "zustand";

export type AgentProjectTarget = "pi" | "codex";
export const useAgentProjectRequest = create<{
  request: { target: AgentProjectTarget; cwd: string; id: number } | null;
}>(() => ({ request: null }));

export function requestAgentProject(target: AgentProjectTarget, cwd: string) {
  useAgentProjectRequest.setState({ request: { target, cwd, id: Date.now() } });
}

export function finishAgentProjectRequest(id: number) {
  if (useAgentProjectRequest.getState().request?.id === id)
    useAgentProjectRequest.setState({ request: null });
}

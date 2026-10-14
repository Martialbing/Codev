import {
  collectUnreadStatusChanges,
  type UnreadStatusTask,
  unreadTaskId,
} from "../taskbar-unread/unreadTasks";
import { sessionIdentity } from "./organization";

type ThreadSnapshot = {
  key: string;
  path: string;
  status?: string;
  // undefined means not loaded; [] means a successful empty snapshot.
  subagents?: { runId: string; status: string }[];
};

/** Seed each parent's first successful snapshot without announcing old children. */
export function collectPiUnreadStatusChanges(
  previous: Map<string, string>,
  loadedParents: Set<string>,
  threads: ThreadSnapshot[],
) {
  const tasks: UnreadStatusTask[] = [];
  for (const thread of threads) {
    tasks.push({ key: thread.key, status: thread.status ?? "" });
    if (thread.subagents === undefined) continue;
    const owner = sessionIdentity(thread.path, thread.key);
    const loaded = loadedParents.has(owner);
    for (const run of thread.subagents) {
      tasks.push({ key: run.runId, status: run.status, child: loaded });
    }
    loadedParents.add(owner);
  }
  return collectUnreadStatusChanges(previous, tasks, (key) =>
    unreadTaskId("pi", key),
  );
}

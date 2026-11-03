import { InMemoryTaskRepository } from "./repositories/in-memory-task-repository";
import type { TaskRepository } from "../shared/task";

// Stash the singleton on globalThis so every bundle and request in a process
// shares one store. Next.js/Turbopack can evaluate this module in separate
// bundles per route in dev (and HMR can re-evaluate it); a plain module-level
// variable would create a fresh, re-seeded store per bundle, making IDs and
// timestamps from one request unknown to another (e.g. "task not found" when
// editing a seeded task).
const GLOBAL_KEY = Symbol.for("artefact.taskRepository");
type GlobalWithRepository = typeof globalThis & {
  [GLOBAL_KEY]?: TaskRepository;
};

/**
 * Single composition point for the Task storage adapter.
 *
 * Returns the (lazily created) singleton stashed on `globalThis`.
 */
export function getTaskRepository(): TaskRepository {
  const globalScope = globalThis as GlobalWithRepository;
  if (!globalScope[GLOBAL_KEY]) {
    globalScope[GLOBAL_KEY] = new InMemoryTaskRepository();
  }
  return globalScope[GLOBAL_KEY]!;
}

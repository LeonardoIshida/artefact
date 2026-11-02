import { InMemoryTaskRepository } from "./repositories/in-memory-task-repository";
import type { TaskRepository } from "../shared/task";

let instance: TaskRepository | null = null;

/**
 * Single composition point for the Task storage adapter.
 *
 * Returns the (lazily created) singleton. Swapping the adapter later is a
 * one-line change here; procedures, the SSR caller, and tests all consume the
 * interface through this accessor.
 */
export function getTaskRepository(): TaskRepository {
  if (instance === null) {
    instance = new InMemoryTaskRepository();
  }
  return instance;
}

// Backwards-compatible alias for callers that imported the singleton directly.
export const taskRepository: TaskRepository = getTaskRepository();

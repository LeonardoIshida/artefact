import { InMemoryTaskRepository } from "./repositories/in-memory-task-repository";
import type { TaskRepository } from "../shared/task";

/**
 * Single composition point for the Task storage adapter.
 *
 * Swap the adapter here (e.g. to a database-backed implementation) and no
 * procedure, route, or UI code changes — they all depend on `TaskRepository`.
 */
export const taskRepository: TaskRepository = new InMemoryTaskRepository();

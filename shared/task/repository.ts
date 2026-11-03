import type {
  ParsedCreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from "./entity";

export interface TaskPageInput {
  status: TaskStatus;
  cursor?: string | null;
}

/** One bounded result page and the opaque position for continuing it. */
export interface TaskPage {
  items: Task[];
  nextCursor: string | null;
}

export class InvalidTaskCursor extends Error {
  constructor() {
    super("Invalid task cursor");
    this.name = "InvalidTaskCursor";
  }
}

/**
 * The domain-validated payload for replacing a task's editable state (PUT).
 * The id is the selector passed separately, so it is excluded here.
 */
export type UpdateTaskPayload = Omit<UpdateTaskInput, "id">;

/**
 * Storage-agnostic seam for Task persistence.
 *
 * Everything above this interface (procedures, SSR callers, UI) depends on
 * this type only — never on a concrete adapter — so a future database
 * adapter drops in without changing any call site.
 *
 * Async from day one: the in-memory adapter is synchronous internally,
 * but the signature stays Promise-returning so the DB adapter is a
 * drop-in replacement.
 */
export interface TaskRepository {
  /**
   * Returns up to 10 tasks for a status in `updatedAt`-descending order, with
   * later insertions first on ties. An invalid or cross-status cursor throws
   * `InvalidTaskCursor`.
   */
  listPage(input: TaskPageInput): Promise<TaskPage>;

  /** Returns the task or throws `TaskNotFound` when missing. */
  get(id: string): Promise<Task>;

  /** Stamps id/timestamps and returns the stored task. */
  create(input: ParsedCreateTaskInput): Promise<Task>;

  /** Replaces editable state, bumps `updatedAt`, returns the stored task. Throws `TaskNotFound` when missing. */
  update(id: string, payload: UpdateTaskPayload): Promise<Task>;

  /** Removes the task. Throws `TaskNotFound` when missing. */
  delete(id: string): Promise<void>;
}

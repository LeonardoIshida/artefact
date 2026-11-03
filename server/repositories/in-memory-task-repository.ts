import { Buffer } from "node:buffer";
import type { Task } from "../../shared/task/entity";
import { TaskNotFound } from "../../shared/task/errors";
import type {
  ParsedCreateTaskInput,
  TaskPage,
  TaskPageInput,
  TaskRepository,
  TaskStatus,
  UpdateTaskPayload,
} from "../../shared/task";
import { InvalidTaskCursor } from "../../shared/task/repository";

const PAGE_SIZE = 10;
const CURSOR_VERSION = 1;
const CURSOR_KEYS = new Set(["version", "status", "updatedAt", "sequence"]);

interface TaskEntry {
  task: Task;
  sequence: number;
}

interface OrderingPosition {
  updatedAt: string;
  sequence: number;
}

interface CursorPosition extends OrderingPosition {
  status: TaskStatus;
}

function comparePositions(
  a: OrderingPosition,
  b: OrderingPosition,
): number {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? -1 : 1;
  }
  return b.sequence - a.sequence;
}

function getOrderingPosition(entry: TaskEntry): OrderingPosition {
  return { updatedAt: entry.task.updatedAt, sequence: entry.sequence };
}

function encodeCursor(position: CursorPosition): string {
  return Buffer.from(JSON.stringify({ version: CURSOR_VERSION, ...position })).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string, status: TaskStatus): CursorPosition {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) {
      throw new InvalidTaskCursor();
    }

    const bytes = Buffer.from(cursor, "base64url");
    if (bytes.toString("base64url") !== cursor) {
      throw new InvalidTaskCursor();
    }

    const value: unknown = JSON.parse(bytes.toString("utf8"));
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value)
    ) {
      throw new InvalidTaskCursor();
    }

    const payload = value as Record<string, unknown>;
    const keys = Object.keys(payload);
    const updatedAt = payload.updatedAt;
    const sequence = payload.sequence;
    if (
      keys.length !== CURSOR_KEYS.size ||
      keys.some((key) => !CURSOR_KEYS.has(key)) ||
      payload.version !== CURSOR_VERSION ||
      payload.status !== status ||
      typeof updatedAt !== "string" ||
      !Number.isSafeInteger(sequence) ||
      typeof sequence !== "number" ||
      sequence < 1
    ) {
      throw new InvalidTaskCursor();
    }

    const timestamp = new Date(updatedAt);
    if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== updatedAt) {
      throw new InvalidTaskCursor();
    }

    return { status, updatedAt, sequence };
  } catch {
    throw new InvalidTaskCursor();
  }
}

/**
 * In-memory, Map-backed adapter for `TaskRepository`.
 *
 * Stamps `id`, `createdAt`, and `updatedAt` (the repository's ownership per
 * the domain spec). Accepts only already-validated input; never re-validates
 * or normalizes.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly store = new Map<string, Task>();
  private readonly seqById = new Map<string, number>();
  private seq = 0;

  constructor(options: { seed?: boolean } = {}) {
    if (options.seed !== false) {
      this.seed();
    }
  }

  private seed(): void {
    const base = Date.now();
    const seeds: Array<{
      title: string;
      description: string | null;
      status: Task["status"];
      offsetMs: number;
    }> = [
      { title: "Seed task: todo", description: null, status: "todo", offsetMs: 2 * 60 * 1000 },
      {
        title: "Seed task: in progress",
        description: "A task currently being worked on.",
        status: "in_progress",
        offsetMs: 1 * 60 * 1000,
      },
      {
        title: "Seed task: done",
        description: "A task that has been completed.",
        status: "done",
        offsetMs: 0,
      },
    ];

    for (const seed of seeds) {
      const timestamp = new Date(base - seed.offsetMs).toISOString();
      const task: Task = {
        id: crypto.randomUUID(),
        title: seed.title,
        description: seed.description,
        status: seed.status,
        tags: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.store.set(task.id, task);
      this.seqById.set(task.id, ++this.seq);
    }
  }

  async listPage({ status, cursor }: TaskPageInput): Promise<TaskPage> {
    const position = cursor == null ? null : decodeCursor(cursor, status);
    const entries: TaskEntry[] = [...this.store.entries()]
      .filter(([, task]) => task.status === status)
      .map(([id, task]) => ({
        task: { ...task },
        sequence: this.seqById.get(id) ?? 0,
      }));

    entries.sort((a, b) => comparePositions(getOrderingPosition(a), getOrderingPosition(b)));

    const afterPosition = position === null
      ? entries
      : entries.filter(
          (entry) => comparePositions(getOrderingPosition(entry), position) > 0,
        );
    const pageEntries = afterPosition.slice(0, PAGE_SIZE);
    const hasMore = afterPosition.length > PAGE_SIZE;
    const lastEntry = pageEntries[pageEntries.length - 1];

    return {
      items: pageEntries.map(({ task }) => task),
      nextCursor:
        hasMore && lastEntry
          ? encodeCursor({
              status,
              updatedAt: lastEntry.task.updatedAt,
              sequence: lastEntry.sequence,
            })
          : null,
    };
  }

  async get(id: string): Promise<Task> {
    const task = this.store.get(id);
    if (!task) {
      throw new TaskNotFound(id);
    }
    return { ...task };
  }

  async create(input: ParsedCreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      status: "todo",
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(task.id, task);
    this.seqById.set(task.id, ++this.seq);
    return { ...task };
  }

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new TaskNotFound(id);
    }
    const now = new Date().toISOString();
    const task: Task = {
      id: existing.id,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      tags: payload.tags,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    this.store.set(id, task);
    this.seqById.set(id, ++this.seq);
    return { ...task };
  }

  async delete(id: string): Promise<void> {
    if (!this.store.has(id)) {
      throw new TaskNotFound(id);
    }
    this.store.delete(id);
    this.seqById.delete(id);
  }
}

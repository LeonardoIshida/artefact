import type { Task } from "../../shared/task/entity";
import { TaskNotFound } from "../../shared/task/errors";
import type { ParsedCreateTaskInput, TaskRepository, UpdateTaskPayload } from "../../shared/task";

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
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.store.set(task.id, task);
      this.seqById.set(task.id, ++this.seq);
    }
  }

  async list(): Promise<Task[]> {
    const entries = [...this.store.entries()].map(([id, task]) => ({
      task: { ...task },
      seq: this.seqById.get(id) ?? 0,
    }));

    entries.sort((a, b) => {
      if (a.task.updatedAt !== b.task.updatedAt) {
        return a.task.updatedAt > b.task.updatedAt ? -1 : 1;
      }
      return b.seq - a.seq;
    });

    return entries.map((entry) => entry.task);
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

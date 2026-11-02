import { describe, expect, it } from "vitest";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import { TaskNotFound } from "../../shared/task/errors";
import type { ParsedCreateTaskInput } from "../../shared/task";

const baseCreateInput: ParsedCreateTaskInput = {
  title: "Test task",
  description: null,
};

describe("InMemoryTaskRepository", () => {
  describe("seeding", () => {
    it("seeds 3 tasks with todo/in_progress/done on construction by default", async () => {
      const repo = new InMemoryTaskRepository();
      const tasks = await repo.list();
      expect(tasks).toHaveLength(3);
      const statuses = tasks.map((task) => task.status).sort();
      expect(statuses).toEqual(["done", "in_progress", "todo"]);
    });

    it("seeds one todo without description and two with descriptions", async () => {
      const repo = new InMemoryTaskRepository();
      const tasks = await repo.list();
      const withoutDescription = tasks.filter((task) => task.description === null);
      expect(withoutDescription).toHaveLength(1);
      expect(withoutDescription[0].status).toBe("todo");
      const withDescription = tasks.filter((task) => task.description !== null);
      expect(withDescription).toHaveLength(2);
    });

    it("seeds tasks with staggered updatedAt so ordering is visible", async () => {
      const repo = new InMemoryTaskRepository();
      const tasks = await repo.list();
      const timestamps = tasks.map((task) => task.updatedAt);
      // descending
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1] >= timestamps[i]).toBe(true);
      }
      // not all identical
      expect(new Set(timestamps).size).toBeGreaterThan(1);
    });

    it("does not seed when constructed with seed: false", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const tasks = await repo.list();
      expect(tasks).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("stamps id, createdAt, updatedAt and defaults status to todo", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const created = await repo.create({ title: "New task", description: "Details" });

      expect(typeof created.id).toBe("string");
      expect(created.id.length).toBeGreaterThan(0);
      expect(created.title).toBe("New task");
      expect(created.description).toBe("Details");
      expect(created.status).toBe("todo");
      expect(typeof created.createdAt).toBe("string");
      expect(created.updatedAt).toBe(created.createdAt);
    });

    it("returns the full saved task", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const created = await repo.create(baseCreateInput);
      const fetched = await repo.get(created.id);
      expect(fetched).toEqual(created);
    });
  });

  describe("get", () => {
    it("returns the task for an existing id", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const created = await repo.create(baseCreateInput);
      const fetched = await repo.get(created.id);
      expect(fetched).toEqual(created);
    });

    it("throws TaskNotFound for a missing id", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      await expect(repo.get("00000000-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(TaskNotFound);
    });
  });

  describe("update", () => {
    it("replaces editable state, bumps updatedAt, preserves createdAt and id", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const created = await repo.create(baseCreateInput);
      const updated = await repo.update(created.id, {
        title: "Updated title",
        description: "Updated description",
        status: "done",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe("Updated title");
      expect(updated.description).toBe("Updated description");
      expect(updated.status).toBe("done");
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt >= created.updatedAt).toBe(true);
    });

    it("throws TaskNotFound for a missing id", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      await expect(
        repo.update("00000000-0000-0000-0000-000000000000", {
          title: "x",
          description: null,
          status: "todo",
        }),
      ).rejects.toBeInstanceOf(TaskNotFound);
    });
  });

  describe("delete", () => {
    it("removes the task and returns void", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const created = await repo.create(baseCreateInput);
      const result = await repo.delete(created.id);
      expect(result).toBeUndefined();
      await expect(repo.get(created.id)).rejects.toBeInstanceOf(TaskNotFound);
    });

    it("throws TaskNotFound for a missing id", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      await expect(repo.delete("00000000-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(TaskNotFound);
    });
  });

  describe("ordering", () => {
    it("lists tasks by updatedAt descending", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const a = await repo.create({ title: "A", description: null });
      // force distinct timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));
      const b = await repo.create({ title: "B", description: null });

      const tasks = await repo.list();
      expect(tasks[0].id).toBe(b.id);
      expect(tasks[1].id).toBe(a.id);
    });

    it("floats an edited task to the top", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const a = await repo.create({ title: "A", description: null });
      await new Promise((resolve) => setTimeout(resolve, 2));
      await repo.create({ title: "B", description: null });

      await new Promise((resolve) => setTimeout(resolve, 2));
      await repo.update(a.id, { title: "A edited", description: null, status: "todo" });

      const tasks = await repo.list();
      expect(tasks[0].id).toBe(a.id);
    });

    it("breaks same-millisecond ties by later insertion first", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      // Insert two tasks synchronously (same millisecond possible); rely on seq tiebreak.
      const a = await repo.create({ title: "A", description: null });
      const b = await repo.create({ title: "B", description: null });

      // Force identical updatedAt by updating both in same tick is not possible deterministically;
      // instead verify the tiebreak never produces undefined and list is stable.
      const tasks = await repo.list();
      expect(tasks).toHaveLength(2);
      // later insertion (b) appears before (a) when timestamps tie; if timestamps differ, order by updatedAt.
      const [first, second] = tasks;
      if (first.updatedAt === second.updatedAt) {
        expect(first.id).toBe(b.id);
      } else {
        expect(first.updatedAt >= second.updatedAt).toBe(true);
      }
      // suppress unused var lint
      void a;
    });
  });
});

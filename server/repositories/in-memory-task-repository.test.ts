import { describe, expect, it, vi } from "vitest";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import { TaskNotFound } from "../../shared/task/errors";
import type { ParsedCreateTaskInput } from "../../shared/task";
import { InvalidTaskCursor } from "../../shared/task/repository";

const baseCreateInput: ParsedCreateTaskInput = {
  title: "Test task",
  description: null,
  tags: [],
};

async function listAllStatusPages(repo: InMemoryTaskRepository) {
  const pages = await Promise.all(
    (["todo", "in_progress", "done"] as const).map((status) =>
      repo.listPage({ status }),
    ),
  );
  return pages.flatMap((page) => page.items);
}

describe("InMemoryTaskRepository", () => {
  describe("seeding", () => {
    it("seeds 15 todo tasks plus one in_progress and one done", async () => {
      const repo = new InMemoryTaskRepository();
      const todoPage = await repo.listPage({ status: "todo" });
      const inProgressPage = await repo.listPage({ status: "in_progress" });
      const donePage = await repo.listPage({ status: "done" });

      expect(todoPage.items).toHaveLength(10);
      expect(typeof todoPage.nextCursor).toBe("string");
      expect(inProgressPage.items).toHaveLength(1);
      expect(donePage.items).toHaveLength(1);
    });

    it("seeds todo tasks without descriptions and in_progress/done with descriptions", async () => {
      const repo = new InMemoryTaskRepository();
      const todoPage = await repo.listPage({ status: "todo" });
      const inProgressPage = await repo.listPage({ status: "in_progress" });
      const donePage = await repo.listPage({ status: "done" });

      expect(todoPage.items.every((task) => task.description === null)).toBe(true);
      expect(inProgressPage.items[0].description).not.toBeNull();
      expect(donePage.items[0].description).not.toBeNull();
    });

    it("seeds tasks with staggered updatedAt values", async () => {
      const repo = new InMemoryTaskRepository();
      const tasks = await listAllStatusPages(repo);
      const timestamps = tasks.map((task) => task.updatedAt);
      expect(new Set(timestamps).size).toBeGreaterThan(1);
    });

    it("does not seed when constructed with seed: false", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const tasks = await listAllStatusPages(repo);
      expect(tasks).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("stamps id, createdAt, updatedAt and defaults status to todo", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const created = await repo.create({ title: "New task", description: "Details", tags: [] });

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
        tags: [],
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
          tags: [],
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
      const a = await repo.create({ title: "A", description: null, tags: [] });
      // force distinct timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));
      const b = await repo.create({ title: "B", description: null, tags: [] });

      const tasks = (await repo.listPage({ status: "todo" })).items;
      expect(tasks[0].id).toBe(b.id);
      expect(tasks[1].id).toBe(a.id);
    });

    it("floats an edited task to the top", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      const a = await repo.create({ title: "A", description: null, tags: [] });
      await new Promise((resolve) => setTimeout(resolve, 2));
      await repo.create({ title: "B", description: null, tags: [] });

      await new Promise((resolve) => setTimeout(resolve, 2));
      await repo.update(a.id, { title: "A edited", description: null, status: "todo", tags: [] });

      const tasks = (await repo.listPage({ status: "todo" })).items;
      expect(tasks[0].id).toBe(a.id);
    });

    it("breaks same-millisecond ties by later insertion first", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      try {
        const repo = new InMemoryTaskRepository({ seed: false });
        await repo.create({ title: "A", description: null, tags: [] });
        await repo.create({ title: "B", description: null, tags: [] });

        const page = await repo.listPage({ status: "todo" });

        expect(page.items.map((task) => task.title)).toEqual(["B", "A"]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("pagination", () => {
    it("returns only tasks from the requested status", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });
      await repo.create({ title: "Todo task", description: null, tags: [] });
      const active = await repo.create({ title: "Active task", description: null, tags: [] });
      await repo.update(active.id, {
        title: "Active task",
        description: null,
        status: "in_progress",
        tags: [],
      });

      const page = await repo.listPage({ status: "in_progress" });

      expect(page.items.map(({ title, status }) => ({ title, status }))).toEqual([
        { title: "Active task", status: "in_progress" },
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it("continues after the tenth task while preserving same-time insertion order", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      try {
        const repo = new InMemoryTaskRepository({ seed: false });
        for (let index = 1; index <= 11; index += 1) {
          await repo.create({
            title: `Task ${String(index).padStart(2, "0")}`,
            description: null,
            tags: [],
          });
        }

        const firstPage = await repo.listPage({ status: "todo" });
        const secondPage = await repo.listPage({
          status: "todo",
          cursor: firstPage.nextCursor,
        });

        expect(firstPage.items.map((task) => task.title)).toEqual([
          "Task 11",
          "Task 10",
          "Task 09",
          "Task 08",
          "Task 07",
          "Task 06",
          "Task 05",
          "Task 04",
          "Task 03",
          "Task 02",
        ]);
        expect(typeof firstPage.nextCursor).toBe("string");
        expect(secondPage.items.map((task) => task.title)).toEqual(["Task 01"]);
        expect(secondPage.nextCursor).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("rejects a malformed cursor through the repository seam", async () => {
      const repo = new InMemoryTaskRepository({ seed: false });

      await expect(
        repo.listPage({ status: "todo", cursor: "not-a-cursor" }),
      ).rejects.toBeInstanceOf(InvalidTaskCursor);
    });
  });
});

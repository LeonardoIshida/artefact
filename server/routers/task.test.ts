import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "../trpc";
import { appRouter } from "./_app";
import { InMemoryTaskRepository } from "../repositories/in-memory-task-repository";
import { ValidationError } from "../../shared/task/errors";

function makeCaller(seed = false) {
  const repo = new InMemoryTaskRepository({ seed });
  return createCallerFactory(appRouter)({ repository: repo });
}

function expectTRPCError(error: unknown, code: string): TRPCError {
  expect(error).toBeInstanceOf(TRPCError);
  const trpcError = error as TRPCError;
  expect(trpcError.code).toBe(code);
  return trpcError;
}

describe("tasks.list", () => {
  it("returns a page containing only tasks from the requested status", async () => {
    const caller = makeCaller(true);

    const page = await caller.tasks.list({ status: "todo" });

    expect(page.items.map((task) => task.status)).toEqual(["todo"]);
    expect(page.nextCursor).toBeNull();
  });

  it("accepts the paging metadata supplied by the infinite-query hook", async () => {
    const caller = makeCaller(true);

    const page = await caller.tasks.list({
      status: "todo",
      direction: "forward",
    });

    expect(page.items.map((task) => task.status)).toEqual(["todo"]);
  });

  it("treats a null cursor as the first page", async () => {
    const caller = makeCaller(true);

    const page = await caller.tasks.list({ status: "todo", cursor: null });

    expect(page.items.map((task) => task.status)).toEqual(["todo"]);
    expect(page.nextCursor).toBeNull();
  });

  it("requires a status", async () => {
    const caller = makeCaller(false);

    await expect(caller.tasks.list({} as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects an invalid status", async () => {
    const caller = makeCaller(false);

    await expect(
      caller.tasks.list({ status: "archived" } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unknown list input keys", async () => {
    const caller = makeCaller(false);

    await expect(
      caller.tasks.list({ status: "todo", limit: 20 } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps an invalid cursor to BAD_REQUEST", async () => {
    const caller = makeCaller(false);

    await expect(
      caller.tasks.list({ status: "todo", cursor: "not-a-cursor" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a cursor issued for another status", async () => {
    const caller = makeCaller(false);
    for (let index = 1; index <= 11; index += 1) {
      await caller.tasks.create({ title: `Task ${index}` });
    }
    const todoPage = await caller.tasks.list({ status: "todo" });

    await expect(
      caller.tasks.list({ status: "done", cursor: todoPage.nextCursor }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns an empty terminal page when the status has no tasks", async () => {
    const caller = makeCaller(false);

    const page = await caller.tasks.list({ status: "todo" });

    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("reflects a newly created task", async () => {
    const caller = makeCaller(false);
    await caller.tasks.create({ title: "New task" });

    const page = await caller.tasks.list({ status: "todo" });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].title).toBe("New task");
  });
});

describe("tasks.get", () => {
  it("returns the task for a valid id", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "Fetch me" });
    const fetched = await caller.tasks.get({ id: created.id });
    expect(fetched).toEqual(created);
  });

  it("throws NOT_FOUND for a well-formed but nonexistent id", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.get({ id: "00000000-0000-0000-0000-000000000000" });
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "NOT_FOUND");
      expect(trpcError.message).toContain("00000000-0000-0000-0000-000000000000");
    }
  });

  it("throws BAD_REQUEST for a malformed id with fieldErrors.id", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.get({ id: "not-a-uuid" });
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors?.id).toBeTruthy();
    }
  });

  it("throws BAD_REQUEST for unknown keys", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "T" });
    try {
      await caller.tasks.get({ id: created.id, extra: true } as never);
      throw new Error("expected throw");
    } catch (error) {
      expectTRPCError(error, "BAD_REQUEST");
    }
  });
});

describe("tasks.create", () => {
  it("returns the stored task with stamped id and timestamps", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "  Trimmed  ", description: "Details" });
    expect(created.title).toBe("Trimmed");
    expect(created.description).toBe("Details");
    expect(created.status).toBe("todo");
    expect(typeof created.id).toBe("string");
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it("normalizes omitted/empty description to null", async () => {
    const caller = makeCaller(false);
    const a = await caller.tasks.create({ title: "A" });
    const b = await caller.tasks.create({ title: "B", description: "" });
    const c = await caller.tasks.create({ title: "C", description: "   " });
    expect(a.description).toBeNull();
    expect(b.description).toBeNull();
    expect(c.description).toBeNull();
  });

  it("throws BAD_REQUEST for empty title", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.create({ title: "" });
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors?.title).toBeTruthy();
    }
  });

  it("throws BAD_REQUEST for whitespace-only title", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.create({ title: "   " });
      throw new Error("expected throw");
    } catch (error) {
      expectTRPCError(error, "BAD_REQUEST");
    }
  });

  it("throws BAD_REQUEST for unknown keys", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.create({ title: "T", id: "x" } as never);
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors?.id).toBeTruthy();
    }
  });

  it("throws BAD_REQUEST for oversized title", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.create({ title: "a".repeat(201) });
      throw new Error("expected throw");
    } catch (error) {
      expectTRPCError(error, "BAD_REQUEST");
    }
  });
});

describe("tasks.update", () => {
  it("returns the updated task with bumped updatedAt and preserved createdAt", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "Original" });
    await new Promise((r) => setTimeout(r, 2));
    const updated = await caller.tasks.update({
      id: created.id,
      title: "Updated",
      description: "New desc",
      status: "done",
      tags: [],
    });
    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe("Updated");
    expect(updated.description).toBe("New desc");
    expect(updated.status).toBe("done");
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it("throws NOT_FOUND for a nonexistent id", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.update({
        id: "00000000-0000-0000-0000-000000000000",
        title: "X",
        description: null,
        status: "todo",
        tags: [],
      });
      throw new Error("expected throw");
    } catch (error) {
      expectTRPCError(error, "NOT_FOUND");
    }
  });

  it("throws BAD_REQUEST for a malformed id", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.update({
        id: "bad",
        title: "X",
        description: null,
        status: "todo",
        tags: [],
      });
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors?.id).toBeTruthy();
    }
  });

  it("throws BAD_REQUEST when description is omitted (full replace)", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "T" });
    try {
      await caller.tasks.update({ id: created.id, title: "X", status: "todo" } as never);
      throw new Error("expected throw");
    } catch (error) {
      expectTRPCError(error, "BAD_REQUEST");
    }
  });

  it("throws BAD_REQUEST for unknown keys", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "T" });
    try {
      await caller.tasks.update({
        id: created.id,
        title: "X",
        description: null,
        status: "todo",
        createdAt: "x",
      } as never);
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors?.createdAt).toBeTruthy();
    }
  });

  it("normalizes empty/whitespace description to null", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "T" });
    const updated = await caller.tasks.update({
      id: created.id,
      title: "T",
      description: "   ",
      status: "todo",
      tags: [],
    });
    expect(updated.description).toBeNull();
  });
});

describe("tasks.delete", () => {
  it("succeeds with no payload for an existing task", async () => {
    const caller = makeCaller(false);
    const created = await caller.tasks.create({ title: "Delete me" });
    const result = await caller.tasks.delete({ id: created.id });
    expect(result).toBeUndefined();
    await expect(caller.tasks.get({ id: created.id })).rejects.toBeInstanceOf(TRPCError);
  });

  it("throws NOT_FOUND for a nonexistent id", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.delete({ id: "00000000-0000-0000-0000-000000000000" });
      throw new Error("expected throw");
    } catch (error) {
      expectTRPCError(error, "NOT_FOUND");
    }
  });

  it("throws BAD_REQUEST for a malformed id", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.delete({ id: "bad" });
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = expectTRPCError(error, "BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors?.id).toBeTruthy();
    }
  });
});

describe("error mapping", () => {
  it("surfaces fieldErrors on BAD_REQUEST via the formatter", async () => {
    const caller = makeCaller(false);
    try {
      await caller.tasks.create({ title: "" });
      throw new Error("expected throw");
    } catch (error) {
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
      expect((trpcError.cause as ValidationError)?.fieldErrors).toBeDefined();
    }
  });
});

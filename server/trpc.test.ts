import { describe, expect, it } from "vitest";
import { createTRPCContext } from "./trpc";
import { createServerCaller } from "./caller";
import { getTaskRepository } from "./composition";

describe("tRPC context factory", () => {
  it("returns the repository from the single composition point", async () => {
    const ctx = await createTRPCContext();
    expect(ctx.repository).toBe(getTaskRepository());
  });
});

describe("server caller factory", () => {
  it("builds a caller that can invoke procedures in-process", async () => {
    const caller = await createServerCaller();
    const result = await caller.health();
    expect(result).toEqual({ status: "ok" });
  });
});

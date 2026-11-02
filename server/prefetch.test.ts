import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { getQueryClient, prefetch, isNotFoundError } from "./prefetch";

describe("prefetch", () => {
  it("calls fetchQuery and populates the cache", async () => {
    const queryClient = getQueryClient();
    const queryKey = ["test", "key"] as const;
    const data = await prefetch(queryClient, {
      queryKey,
      queryFn: async () => "hello",
    });
    expect(data).toBe("hello");
    expect(queryClient.getQueryData(queryKey)).toBe("hello");
  });
});

describe("isNotFoundError", () => {
  it("returns true for a TRPCError with NOT_FOUND code", () => {
    const error = new TRPCError({ code: "NOT_FOUND", message: "missing" });
    expect(isNotFoundError(error)).toBe(true);
  });

  it("returns false for other TRPCError codes", () => {
    const error = new TRPCError({ code: "BAD_REQUEST", message: "bad" });
    expect(isNotFoundError(error)).toBe(false);
  });

  it("returns false for non-TRPCError values", () => {
    expect(isNotFoundError(new Error("x"))).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});

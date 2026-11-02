import { describe, expect, it } from "vitest";
import { parseTrpcError } from "./parse-trpc-error";

describe("parseTrpcError", () => {
  it("returns empty field errors and a fallback message for null/undefined", () => {
    expect(parseTrpcError(null)).toEqual({
      code: null,
      fieldErrors: [],
      message: "Something went wrong",
      isNotFound: false,
    });
    expect(parseTrpcError(undefined)).toEqual({
      code: null,
      fieldErrors: [],
      message: "Something went wrong",
      isNotFound: false,
    });
  });

  it("extracts message from an Error", () => {
    const result = parseTrpcError(new Error("Network failure"));
    expect(result.message).toBe("Network failure");
    expect(result.fieldErrors).toEqual([]);
    expect(result.isNotFound).toBe(false);
  });

  it("extracts fieldErrors array from tRPC error data", () => {
    const err = {
      message: "Validation failed",
      data: {
        code: "BAD_REQUEST",
        fieldErrors: [
          { field: "title", message: "Title is required" },
          { field: "description", message: "Description must be at most 2000 characters" },
        ],
      },
    };
    const result = parseTrpcError(err);
    expect(result.code).toBe("BAD_REQUEST");
    expect(result.message).toBe("Validation failed");
    expect(result.fieldErrors).toEqual([
      { field: "title", message: "Title is required" },
      { field: "description", message: "Description must be at most 2000 characters" },
    ]);
    expect(result.isNotFound).toBe(false);
  });

  it("marks not-found errors", () => {
    const err = {
      message: "Task not found: 123e4567-e89b-12d3-a456-426614174000",
      data: { code: "NOT_FOUND" },
    };
    const result = parseTrpcError(err);
    expect(result.code).toBe("NOT_FOUND");
    expect(result.isNotFound).toBe(true);
    expect(result.fieldErrors).toEqual([]);
  });

  it("filters malformed field-error entries", () => {
    const err = {
      message: "Validation failed",
      data: {
        code: "BAD_REQUEST",
        fieldErrors: [
          { field: "title", message: "Title is required" },
          { field: 42, message: "bad" },
          null,
          { field: "x" },
        ],
      },
    };
    const result = parseTrpcError(err);
    expect(result.fieldErrors).toEqual([{ field: "title", message: "Title is required" }]);
  });

  it("falls back to error.message when fieldErrors absent", () => {
    const err = { message: "Server exploded", data: { code: "INTERNAL_SERVER_ERROR" } };
    const result = parseTrpcError(err);
    expect(result.message).toBe("Server exploded");
    expect(result.fieldErrors).toEqual([]);
    expect(result.isNotFound).toBe(false);
  });

  it("reads from error.shape.data when data is nested", () => {
    const err = {
      message: "Validation failed",
      shape: { data: { code: "BAD_REQUEST", fieldErrors: [{ field: "id", message: "Invalid UUID format" }] } },
    };
    const result = parseTrpcError(err);
    expect(result.code).toBe("BAD_REQUEST");
    expect(result.fieldErrors).toEqual([{ field: "id", message: "Invalid UUID format" }]);
  });
});
import { describe, expect, it } from "vitest";
import {
  parseCreateTaskInput,
  parseTaskId,
  parseUpdateTaskInput,
  TaskNotFound,
  ValidationError,
  ValidationFailed,
} from "./task";

function captureValidationError(fn: () => unknown): ValidationFailed {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(ValidationError);
  expect(caught).toBeInstanceOf(ValidationFailed);
  return caught as ValidationFailed;
}

describe("parseCreateTaskInput", () => {
  it("parses a valid title, trims surrounding whitespace, and defaults omitted description to null", () => {
    const result = parseCreateTaskInput({
      title: "  Write domain spec  ",
    });

    expect(result).toEqual({
      title: "Write domain spec",
      description: null,
    });
  });

  it.each([
    { label: "omitted", input: { title: "Task" }, expected: null },
    { label: "undefined", input: { title: "Task", description: undefined }, expected: null },
    { label: "empty string", input: { title: "Task", description: "" }, expected: null },
    { label: "whitespace-only", input: { title: "Task", description: "   \n\t  " }, expected: null },
    {
      label: "real text",
      input: { title: "Task", description: "Detailed acceptance criteria" },
      expected: "Detailed acceptance criteria",
    },
  ])("normalizes description ($label) to $expected", ({ input, expected }) => {
    const result = parseCreateTaskInput(input);
    expect(result.description).toBe(expected);
  });

  it("accepts a title of exactly 200 characters after trimming", () => {
    const exactMaxTitle = "a".repeat(200);
    const result = parseCreateTaskInput({ title: `  ${exactMaxTitle}  ` });
    expect(result.title).toBe(exactMaxTitle);
  });

  it.each([
    { label: "missing title", input: {} },
    { label: "non-string title", input: { title: 123 } },
    { label: "empty title", input: { title: "" } },
    { label: "whitespace-only title", input: { title: "   \t\n  " } },
    { label: "title exceeding 200 chars", input: { title: "a".repeat(201) } },
  ])("rejects invalid title ($label) with ValidationFailed carrying fieldErrors.title", ({ input }) => {
    const validationError = captureValidationError(() => parseCreateTaskInput(input));
    expect(validationError.code).toBe("VALIDATION_FAILED");
    expect(typeof validationError.fieldErrors.title).toBe("string");
    expect(validationError.fieldErrors.title.length).toBeGreaterThan(0);
  });

  it("accepts a description of exactly 2000 characters", () => {
    const exactMaxDescription = "d".repeat(2000);
    const result = parseCreateTaskInput({
      title: "Valid title",
      description: exactMaxDescription,
    });
    expect(result.description).toBe(exactMaxDescription);
  });

  it.each([
    { label: "exceeding 2000 chars", description: "d".repeat(2001) },
    { label: "non-string number", description: 42 },
    { label: "null on create", description: null },
  ])("rejects invalid description ($label) on create with fieldErrors.description", ({ description }) => {
    const validationError = captureValidationError(() =>
      parseCreateTaskInput({ title: "Valid title", description }),
    );
    expect(typeof validationError.fieldErrors.description).toBe("string");
    expect(validationError.fieldErrors.description.length).toBeGreaterThan(0);
  });

  it.each([
    { label: "id", extraKey: "id", extraValue: "550e8400-e29b-41d4-a716-446655440000" },
    { label: "status", extraKey: "status", extraValue: "todo" },
    { label: "createdAt", extraKey: "createdAt", extraValue: "2026-11-02T00:00:00.000Z" },
    { label: "updatedAt", extraKey: "updatedAt", extraValue: "2026-11-02T00:00:00.000Z" },
    { label: "typo field", extraKey: "titulo", extraValue: "Wrong key" },
  ])("rejects unknown key ($label) on create", ({ extraKey, extraValue }) => {
    const validationError = captureValidationError(() =>
      parseCreateTaskInput({
        title: "Valid title",
        [extraKey]: extraValue,
      }),
    );
    expect(typeof validationError.fieldErrors[extraKey]).toBe("string");
  });

  it.each([
    { label: "null", input: null },
    { label: "undefined", input: undefined },
    { label: "array", input: [] },
    { label: "primitive string", input: "Task" },
  ])("rejects non-object payload ($label) on create with ValidationFailed", ({ input }) => {
    const validationError = captureValidationError(() => parseCreateTaskInput(input));
    expect(typeof validationError.fieldErrors.title).toBe("string");
  });
});

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("parseUpdateTaskInput", () => {
  it.each(["todo", "in_progress", "done"] as const)(
    "parses valid update payload with status %s and trims title",
    (status) => {
      const result = parseUpdateTaskInput({
        id: VALID_UUID,
        title: "  Updated title  ",
        description: "Updated details",
        status,
      });

      expect(result).toEqual({
        id: VALID_UUID,
        title: "Updated title",
        description: "Updated details",
        status,
      });
    },
  );

  it.each([
    { label: "null", description: null, expected: null },
    { label: "empty string", description: "", expected: null },
    { label: "whitespace-only", description: "  \n\t ", expected: null },
    { label: "real text", description: "Keep this", expected: "Keep this" },
  ])("normalizes update description ($label) to $expected", ({ description, expected }) => {
    const result = parseUpdateTaskInput({
      id: VALID_UUID,
      title: "Task",
      description,
      status: "in_progress",
    });

    expect(result.description).toBe(expected);
  });

  it.each([
    { label: "missing id", id: undefined },
    { label: "empty string", id: "" },
    { label: "non-UUID string", id: "not-a-uuid" },
    { label: "wrong segment length", id: "550e8400-e29b-41d4-a716-44665544000" },
    { label: "non-hex characters", id: "550e8400-e29b-41d4-a716-44665544000z" },
    { label: "number", id: 12345 },
  ])("rejects malformed id ($label) on update with fieldErrors.id", ({ id }) => {
    const validationError = captureValidationError(() =>
      parseUpdateTaskInput({
        id,
        title: "Valid title",
        description: null,
        status: "todo",
      }),
    );
    expect(typeof validationError.fieldErrors.id).toBe("string");
  });

  it.each([
    {
      label: "omitted description",
      payload: { id: VALID_UUID, title: "Valid", status: "todo" },
      expectedField: "description",
    },
    {
      label: "undefined description",
      payload: { id: VALID_UUID, title: "Valid", description: undefined, status: "todo" },
      expectedField: "description",
    },
    {
      label: "description exceeding 2000 chars",
      payload: {
        id: VALID_UUID,
        title: "Valid",
        description: "x".repeat(2001),
        status: "todo",
      },
      expectedField: "description",
    },
    {
      label: "missing title",
      payload: { id: VALID_UUID, description: null, status: "todo" },
      expectedField: "title",
    },
    {
      label: "whitespace-only title",
      payload: { id: VALID_UUID, title: "   ", description: null, status: "todo" },
      expectedField: "title",
    },
    {
      label: "title exceeding 200 chars",
      payload: {
        id: VALID_UUID,
        title: "t".repeat(201),
        description: null,
        status: "todo",
      },
      expectedField: "title",
    },
    {
      label: "missing status",
      payload: { id: VALID_UUID, title: "Valid", description: null },
      expectedField: "status",
    },
    {
      label: "invalid status value",
      payload: { id: VALID_UUID, title: "Valid", description: null, status: "archived" },
      expectedField: "status",
    },
    {
      label: "unknown key createdAt",
      payload: {
        id: VALID_UUID,
        title: "Valid",
        description: null,
        status: "todo",
        createdAt: "2026-11-02T00:00:00.000Z",
      },
      expectedField: "createdAt",
    },
  ])("rejects invalid update payload ($label) with fieldErrors.$expectedField", ({ payload, expectedField }) => {
    const validationError = captureValidationError(() => parseUpdateTaskInput(payload));
    expect(typeof validationError.fieldErrors[expectedField]).toBe("string");
  });

  it("collects multiple field errors simultaneously when several fields are invalid", () => {
    const validationError = captureValidationError(() =>
      parseUpdateTaskInput({
        id: "bad-id",
        title: "   ",
        description: 123,
        status: "invalid",
        extra: true,
      }),
    );
    expect(Object.keys(validationError.fieldErrors).sort()).toEqual([
      "description",
      "extra",
      "id",
      "status",
      "title",
    ]);
  });

  it.each([
    { label: "null", input: null },
    { label: "undefined", input: undefined },
    { label: "array", input: [] },
  ])("rejects non-object payload ($label) on update with ValidationFailed", ({ input }) => {
    const validationError = captureValidationError(() => parseUpdateTaskInput(input));
    expect(Object.keys(validationError.fieldErrors).sort()).toEqual([
      "description",
      "id",
      "status",
      "title",
    ]);
  });
});

describe("parseTaskId", () => {
  it("returns the id when given a valid UUID string", () => {
    expect(parseTaskId(VALID_UUID)).toBe(VALID_UUID);
  });

  it.each([
    { label: "empty string", id: "" },
    { label: "malformed UUID", id: "123-abc" },
    { label: "null", id: null },
    { label: "undefined", id: undefined },
  ])("rejects invalid id ($label) with ValidationFailed carrying fieldErrors.id", ({ id }) => {
    const validationError = captureValidationError(() => parseTaskId(id));
    expect(typeof validationError.fieldErrors.id).toBe("string");
  });
});

describe("TaskNotFound", () => {
  it("constructs a domain lookup error carrying taskId and code TASK_NOT_FOUND", () => {
    const error = new TaskNotFound(VALID_UUID);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TaskNotFound);
    expect(error.name).toBe("TaskNotFound");
    expect(error.code).toBe("TASK_NOT_FOUND");
    expect(error.taskId).toBe(VALID_UUID);
    expect(error.message).toContain(VALID_UUID);
  });
});

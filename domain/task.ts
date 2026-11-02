export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
}

export type FieldErrors = Record<string, string>;

export class ValidationFailed extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors, message = "Validation failed") {
    super(message);
    this.name = "ValidationFailed";
    this.fieldErrors = fieldErrors;
  }
}

export const ValidationError = ValidationFailed;
export type ValidationError = ValidationFailed;

export class TaskNotFound extends Error {
  readonly code = "TASK_NOT_FOUND" as const;
  readonly taskId: string;

  constructor(taskId: string) {
    super(`Task with id "${taskId}" was not found`);
    this.name = "TaskNotFound";
    this.taskId = taskId;
  }
}

export const TaskNotFoundError = TaskNotFound;
export type TaskNotFoundError = TaskNotFound;

const CREATE_ALLOWED_KEYS = new Set(["title", "description"]);
const UPDATE_ALLOWED_KEYS = new Set(["id", "title", "description", "status"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

function validateUuid(value: unknown): string | null {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return null;
  }
  return value;
}

/**
 * Validates that an untrusted value is a well-formed task UUID.
 */
export function parseTaskId(id: unknown): string {
  const validId = validateUuid(id);
  if (validId === null) {
    throw new ValidationFailed({ id: "Task id must be a valid UUID" });
  }
  return validId;
}

/**
 * Validates and normalizes a raw payload for creating a new task.
 */
export function parseCreateTaskInput(input: unknown): CreateTaskInput {
  if (!isPlainObject(input)) {
    throw new ValidationFailed({ _payload: "Input must be a plain object" });
  }

  const fieldErrors: FieldErrors = {};

  for (const key of Object.keys(input)) {
    if (!CREATE_ALLOWED_KEYS.has(key)) {
      fieldErrors[key] = `Unknown field "${key}" is not allowed`;
    }
  }

  let title = "";
  if (typeof input.title !== "string") {
    fieldErrors.title = "Title is required";
  } else {
    title = input.title.trim();
    if (title.length === 0) {
      fieldErrors.title = "Title is required";
    } else if (title.length > TITLE_MAX_LENGTH) {
      fieldErrors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters`;
    }
  }

  let description: string | null = null;
  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      fieldErrors.description = "Description must be a string";
    } else if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      fieldErrors.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`;
    } else if (input.description.trim() !== "") {
      description = input.description;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationFailed(fieldErrors);
  }

  return {
    title,
    description,
  };
}

/**
 * Validates and normalizes a raw full-replace payload for updating an existing task.
 */
export function parseUpdateTaskInput(input: unknown): UpdateTaskInput {
  if (!isPlainObject(input)) {
    throw new ValidationFailed({ _payload: "Input must be a plain object" });
  }

  const fieldErrors: FieldErrors = {};

  for (const key of Object.keys(input)) {
    if (!UPDATE_ALLOWED_KEYS.has(key)) {
      fieldErrors[key] = `Unknown field "${key}" is not allowed`;
    }
  }

  const id = validateUuid(input.id);
  if (id === null) {
    fieldErrors.id = "Task id must be a valid UUID";
  }

  let title = "";
  if (typeof input.title !== "string") {
    fieldErrors.title = "Title is required";
  } else {
    title = input.title.trim();
    if (title.length === 0) {
      fieldErrors.title = "Title is required";
    } else if (title.length > TITLE_MAX_LENGTH) {
      fieldErrors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters`;
    }
  }

  let description: string | null = null;
  // PUT replaces the entire editable state, so callers must explicitly send `null` to clear a description rather than omitting the key.
  if (!("description" in input) || input.description === undefined) {
    fieldErrors.description = "Description must be provided (string or null)";
  } else if (input.description !== null) {
    if (typeof input.description !== "string") {
      fieldErrors.description = "Description must be a string or null";
    } else if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      fieldErrors.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`;
    } else if (input.description.trim() !== "") {
      description = input.description;
    }
  }

  if (!isValidTaskStatus(input.status)) {
    fieldErrors.status = `Status must be one of: ${TASK_STATUSES.join(", ")}`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationFailed(fieldErrors);
  }

  return {
    id: id!,
    title,
    description,
    status: input.status as TaskStatus,
  };
}

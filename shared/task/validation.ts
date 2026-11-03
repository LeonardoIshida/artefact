import {
  DESCRIPTION_MAX_LENGTH,
  TASK_STATUSES,
  TITLE_MAX_LENGTH,
  type ParsedCreateTaskInput,
  type TaskStatus,
  type UpdateTaskInput,
} from "./entity";
import { ValidationFailed, type FieldErrors } from "./errors";
import type { TaskPageInput } from "./repository";

const CREATE_ALLOWED_KEYS = new Set(["title", "description"]);
const UPDATE_ALLOWED_KEYS = new Set(["id", "title", "description", "status"]);
const LIST_ALLOWED_KEYS = new Set(["status", "cursor", "direction"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

/** Validates a lane-page query and strips tRPC's direction metadata. */
export function parseTaskPageInput(input: unknown): TaskPageInput {
  if (!isPlainObject(input)) {
    throw new ValidationFailed({
      status: `Status must be one of: ${TASK_STATUSES.join(", ")}`,
    });
  }

  const fieldErrors: FieldErrors = {};
  collectUnknownKeyErrors(input, LIST_ALLOWED_KEYS, fieldErrors);

  const status = isValidTaskStatus(input.status) ? input.status : null;
  if (status === null) {
    fieldErrors.status = `Status must be one of: ${TASK_STATUSES.join(", ")}`;
  }

  let cursor: string | null | undefined;
  if (input.cursor !== undefined) {
    if (input.cursor !== null && typeof input.cursor !== "string") {
      fieldErrors.cursor = "Cursor must be a string or null";
    } else {
      cursor = input.cursor;
    }
  }

  if (
    input.direction !== undefined &&
    input.direction !== "forward" &&
    input.direction !== "backward"
  ) {
    fieldErrors.direction = "Direction must be forward or backward";
  }

  if (Object.keys(fieldErrors).length > 0 || status === null) {
    throw new ValidationFailed(fieldErrors);
  }

  return cursor === undefined ? { status } : { status, cursor };
}

function validateUuid(value: unknown): string | null {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return null;
  }
  return value;
}

function collectUnknownKeyErrors(
  input: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  fieldErrors: FieldErrors,
): void {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      fieldErrors[key] = `Unknown field "${key}" is not allowed`;
    }
  }
}

function validateTitle(rawTitle: unknown, fieldErrors: FieldErrors): string {
  if (typeof rawTitle !== "string") {
    fieldErrors.title = "Title is required";
    return "";
  }

  const trimmed = rawTitle.trim();
  if (trimmed.length === 0) {
    fieldErrors.title = "Title is required";
  } else if (trimmed.length > TITLE_MAX_LENGTH) {
    fieldErrors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters`;
  }
  return trimmed;
}

function normalizeDescriptionText(
  rawDescription: string,
  fieldErrors: FieldErrors,
): string | null {
  // Whitespace-only descriptions collapse to "no description" regardless of length, so a long blank value never trips the length cap.
  if (rawDescription.trim() === "") {
    return null;
  }
  if (rawDescription.length > DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`;
    return null;
  }
  return rawDescription;
}

/**
 * Validates that an untrusted value is a well-formed task UUID.
 */
export function parseTaskId(id: unknown): string {
  const validId = validateUuid(id);
  if (validId === null) {
    throw new ValidationFailed({ id: "Invalid UUID format" });
  }
  return validId;
}

/**
 * Validates and normalizes a raw payload for creating a new task.
 */
export function parseCreateTaskInput(input: unknown): ParsedCreateTaskInput {
  if (!isPlainObject(input)) {
    throw new ValidationFailed({ title: "Title is required" });
  }

  const fieldErrors: FieldErrors = {};
  collectUnknownKeyErrors(input, CREATE_ALLOWED_KEYS, fieldErrors);

  const title = validateTitle(input.title, fieldErrors);

  let description: string | null = null;
  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      fieldErrors.description = "Description must be a string";
    } else {
      description = normalizeDescriptionText(input.description, fieldErrors);
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
    throw new ValidationFailed({
      id: "Invalid UUID format",
      title: "Title is required",
      description: "Description must be provided (string or null)",
      status: `Status must be one of: ${TASK_STATUSES.join(", ")}`,
    });
  }

  const fieldErrors: FieldErrors = {};
  collectUnknownKeyErrors(input, UPDATE_ALLOWED_KEYS, fieldErrors);

  const id = validateUuid(input.id);
  if (id === null) {
    fieldErrors.id = "Invalid UUID format";
  }

  const title = validateTitle(input.title, fieldErrors);

  let description: string | null = null;
  // PUT replaces the entire editable state, so callers must explicitly send `null` to clear a description rather than omitting the key.
  if (!("description" in input) || input.description === undefined) {
    fieldErrors.description = "Description must be provided (string or null)";
  } else if (input.description !== null) {
    if (typeof input.description !== "string") {
      fieldErrors.description = "Description must be a string or null";
    } else {
      description = normalizeDescriptionText(input.description, fieldErrors);
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

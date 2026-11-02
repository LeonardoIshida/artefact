export interface ParsedFieldError {
  field: string;
  message: string;
}

export interface ParsedTrpcError {
  code: string | null;
  fieldErrors: ParsedFieldError[];
  message: string;
  isNotFound: boolean;
}

const FALLBACK_MESSAGE = "Something went wrong";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractFieldErrors(value: unknown): ParsedFieldError[] {
  if (!Array.isArray(value)) return [];
  const result: ParsedFieldError[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (!record) continue;
    const field = record.field;
    const message = record.message;
    if (typeof field !== "string" || typeof message !== "string") continue;
    result.push({ field, message });
  }
  return result;
}

function findData(error: unknown): Record<string, unknown> | null {
  const record = asRecord(error);
  if (!record) return null;
  // tRPC client errors expose `data` directly; the in-process caller error
  // may nest it under `shape.data`. Check both.
  const direct = asRecord(record.data);
  if (direct) return direct;
  const shape = asRecord(record.shape);
  const nested = shape ? asRecord(shape.data) : null;
  if (nested) return nested;
  return null;
}

export function parseTrpcError(error: unknown): ParsedTrpcError {
  const record = asRecord(error);

  let code: string | null = null;
  let message = FALLBACK_MESSAGE;
  let fieldErrors: ParsedFieldError[] = [];

  if (record) {
    if (typeof record.message === "string" && record.message.length > 0) {
      message = record.message;
    }

    const data = findData(record);
    if (data) {
      if (typeof data.code === "string") code = data.code;
      fieldErrors = extractFieldErrors(data.fieldErrors);
    }

    // Fall back to a code carried at the top level (some error shapes).
    if (code === null && typeof record.code === "string") {
      code = record.code;
    }
  } else if (error instanceof Error) {
    if (error.message.length > 0) message = error.message;
  }

  // If the transport put field errors under a different key, leave them empty;
  // callers fall back to `message` for display.

  return {
    code,
    fieldErrors,
    message,
    isNotFound: code === "NOT_FOUND",
  };
}
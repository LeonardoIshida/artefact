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

// The spec refers to this class as both `ValidationError` (Implementation Decisions) and `ValidationFailed` (Error taxonomy).
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

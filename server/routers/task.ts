import { TRPCError } from "@trpc/server";
import {
  isPlainObject,
  parseCreateTaskInput,
  parseTaskPageInput,
  parseTaskId,
  parseUpdateTaskInput,
  InvalidTaskCursor,
  TaskNotFound,
  ValidationError,
  type ParsedCreateTaskInput,
  type UpdateTaskInput,
  type TaskPageInput,
} from "../../shared/task";
import { publicProcedure, router, toStandardSchema } from "../trpc";

function toTRPCError(error: unknown): never {
  if (error instanceof TaskNotFound) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Task not found: ${error.taskId}`,
    });
  }
  if (error instanceof InvalidTaskCursor) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}
function parseIdEnvelope(input: unknown): { id: string } {
  if (!isPlainObject(input)) {
    throw new ValidationError({ id: "Invalid UUID format" });
  }
  const fieldErrors: Record<string, string> = {};
  for (const key of Object.keys(input)) {
    if (key !== "id") {
      fieldErrors[key] = `Unknown field "${key}" is not allowed`;
    }
  }
  let id = "";
  try {
    id = parseTaskId(input.id);
  } catch (error) {
    if (error instanceof ValidationError) {
      Object.assign(fieldErrors, error.fieldErrors);
    } else {
      throw error;
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError(fieldErrors);
  }
  return { id };
}

const idInput = toStandardSchema<{ id: string }, { id: string }>(parseIdEnvelope);
const createInput = toStandardSchema<
  { title: string; description?: string },
  ParsedCreateTaskInput
>(parseCreateTaskInput);
const updateInput = toStandardSchema<
  { id: string; title: string; description: string | null; status: UpdateTaskInput["status"] },
  UpdateTaskInput
>(parseUpdateTaskInput);
const taskPageInput = toStandardSchema<
  TaskPageInput & { direction?: "forward" | "backward" },
  TaskPageInput
>(parseTaskPageInput);

export const taskRouter = router({
  list: publicProcedure.input(taskPageInput).query(async ({ ctx, input }) => {
    try {
      return await ctx.repository.listPage(input);
    } catch (error) {
      toTRPCError(error);
    }
  }),

  get: publicProcedure.input(idInput).query(async ({ ctx, input }) => {
    try {
      return await ctx.repository.get(input.id);
    } catch (error) {
      toTRPCError(error);
    }
  }),

  create: publicProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    return ctx.repository.create(input);
  }),

  update: publicProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    try {
      return await ctx.repository.update(input.id, {
        title: input.title,
        description: input.description,
        status: input.status,
      });
    } catch (error) {
      toTRPCError(error);
    }
  }),

  delete: publicProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    try {
      await ctx.repository.delete(input.id);
    } catch (error) {
      toTRPCError(error);
    }
  }),
});

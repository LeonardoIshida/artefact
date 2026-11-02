import { initTRPC } from "@trpc/server";
import type { TaskRepository } from "../shared/task";
import { ValidationError } from "../shared/task/errors";
import { getTaskRepository } from "./composition";

export type Context = {
  repository: TaskRepository;
};

/**
 * Creates the per-request tRPC context. The repository is the only slot for now;
 * auth/session slots are added when that item lands.
 */
export async function createTRPCContext(): Promise<Context> {
  return { repository: getTaskRepository() };
}

const t = initTRPC.context<Context>().create({
  // Preserve field-level validation errors across the wire. tRPC's default
  // error shape omits `cause`, so without this the UI can't tell which field
  // failed. (Spec 03, Implementation Decisions — error formatting.)
  errorFormatter({ shape, error }) {
    const validationError =
      error.cause instanceof ValidationError
        ? error.cause
        : error instanceof ValidationError
          ? error
          : null;

    return {
      ...shape,
      data: {
        ...shape.data,
        fieldErrors: validationError?.fieldErrors,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
export const middleware = t.middleware;

import { initTRPC } from "@trpc/server";
import type { TaskRepository } from "../shared/task";
import { ValidationError } from "../shared/task/errors";
import { getTaskRepository } from "./composition";

export type Context = {
  repository: TaskRepository;
};

export async function createTRPCContext(): Promise<Context> {
  return { repository: getTaskRepository() };
}

// Local mirror of the Standard Schema v1 spec (https://standardschema.dev).
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) =>
      | { readonly value: Output; readonly issues?: undefined }
      | { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<PropertyKey> }> };
  };
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const validationError =
      error.cause instanceof ValidationError
        ? error.cause
        : error instanceof ValidationError
          ? error
          : null;

    // Wire shape: array of { field, message } (Spec 06). Domain keeps a map
    // internally; conversion happens here at the boundary.
    let fieldErrors: Array<{ field: string; message: string }> | undefined;
    if (validationError) {
      fieldErrors = Object.entries(validationError.fieldErrors).map(([field, message]) => ({
        field,
        message,
      }));
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        fieldErrors,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export function toStandardSchema<TInput, TOutput>(
  parse: (input: unknown) => TOutput,
): StandardSchemaV1<TInput, TOutput> {
  return {
    "~standard": {
      version: 1,
      vendor: "artefact",
      validate: (value: unknown) => {
        // Throwing (rather than returning issues) keeps `error.cause` as the
        // ValidationError, so field-level errors survive both the in-process
        // caller (createCaller) and the HTTP error formatter.
        const parsed = parse(value);
        return { value: parsed };
      },
    },
  };
}

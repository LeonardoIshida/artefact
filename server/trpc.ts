import { initTRPC } from "@trpc/server";

/**
 * tRPC context for the App Router. Request-scoped data (auth, headers, etc.)
 * is added here as the backend grows; kept empty for the template.
 */
export async function createTRPCContext() {
  return {};
}

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

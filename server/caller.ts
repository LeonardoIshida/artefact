import { createCallerFactory } from "./trpc";
import { appRouter } from "./routers/_app";
import { createTRPCContext } from "./trpc";

/**
 * Builds an in-process tRPC caller backed by the (context-injected) repository.
 *
 * Used for server-side prefetch (SSR) without an HTTP round-trip. Item 5
 * consumes this factory; it is not constructed per request beyond the caller.
 */
export async function createServerCaller() {
  const ctx = await createTRPCContext();
  return createCallerFactory(appRouter)(ctx);
}

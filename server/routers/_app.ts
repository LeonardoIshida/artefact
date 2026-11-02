import { router, publicProcedure } from "../trpc";

/**
 * Root tRPC router. Feature routers (e.g. task) are merged here as specs land.
 */
export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
});

export type AppRouter = typeof appRouter;

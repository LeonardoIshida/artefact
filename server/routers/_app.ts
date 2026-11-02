import { router, publicProcedure } from "../trpc";
import { taskRouter } from "./task";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" as const })),
  tasks: taskRouter,
});

export type AppRouter = typeof appRouter;

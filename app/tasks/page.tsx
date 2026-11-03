import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { createQueryClient } from "@/lib/query-client";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory, createTRPCContext } from "@/server/trpc";
import type { AppRouter } from "@/server/routers/_app";
import TaskSuccessNotice from "./_components/TaskSuccessNotice";
import TaskList from "./_components/TaskList";
import TaskBoardSkeleton from "./_components/TaskBoardSkeleton";

export const metadata: Metadata = {
  title: "Tasks | Artefact",
};

export default async function TasksPage() {
  await connection();
  const queryClient = createQueryClient();
  const ctx = await createTRPCContext();
  const caller = createCallerFactory(appRouter)(ctx);
  const helpers = createHydrationHelpers<AppRouter>(caller, () => queryClient);

  await Promise.allSettled([
    helpers.trpc.tasks.list.prefetchInfinite({ status: "todo" }, { initialCursor: null }),
    helpers.trpc.tasks.list.prefetchInfinite({ status: "in_progress" }, { initialCursor: null }),
    helpers.trpc.tasks.list.prefetchInfinite({ status: "done" }, { initialCursor: null }),
  ]);

  const { HydrateClient } = helpers;

  return (
    <>
      <Suspense fallback={null}>
        <TaskSuccessNotice />
      </Suspense>
      <Suspense fallback={<TaskBoardSkeleton />}>
        <HydrateClient>
          <TaskList />
        </HydrateClient>
      </Suspense>
    </>
  );
}
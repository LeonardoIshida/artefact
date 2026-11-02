import { Suspense } from "react";
import type { Metadata } from "next";
import { createServerCaller } from "@/server/caller";
import TaskSuccessNotice from "./_components/TaskSuccessNotice";
import TaskList from "./_components/TaskList";
import TaskBoardSkeleton from "./_components/TaskBoardSkeleton";

export const metadata: Metadata = {
  title: "Tasks | Artefact",
};

export default async function TasksPage() {
  const caller = await createServerCaller();
  const tasks = await caller.tasks.list();
  return (
    <>
      <Suspense fallback={null}>
        <TaskSuccessNotice />
      </Suspense>
      <Suspense fallback={<TaskBoardSkeleton />}>
        <TaskList initialTasks={tasks} />
      </Suspense>
    </>
  );
}

import { Suspense } from "react";
import { createServerCaller } from "@/server/caller";
import TaskList from "./_components/TaskList";

export default async function TasksPage() {
  const caller = await createServerCaller();
  const tasks = await caller.tasks.list();
  return (
    <Suspense fallback={null}>
      <TaskList initialTasks={tasks} />
    </Suspense>
  );
}
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TRPCError } from "@trpc/server";
import { createServerCaller } from "@/server/caller";
import type { Task } from "@/shared/task";
import TaskForm from "../../_components/TaskForm";

export const instant = false;

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = await createServerCaller();
  let task: Task;

  try {
    task = await caller.tasks.get({ id });
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) {
      redirect("/tasks");
    }
    throw error;
  }

  return (
    <Suspense fallback={null}>
      <TaskForm key={task.id} mode="edit" initialTask={task} />
    </Suspense>
  );
}

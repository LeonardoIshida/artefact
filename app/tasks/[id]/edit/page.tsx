import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createServerCaller } from "@/server/caller";
import { isNotFoundError } from "@/server/prefetch";
import TaskForm from "../../_components/TaskForm";

export const instant = false;

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = await createServerCaller();
  let task;
  try {
    task = await caller.tasks.get({ id });
  } catch (error) {
    if (isNotFoundError(error)) notFound();
    throw error;
  }
  return (
    <Suspense fallback={null}>
      <TaskForm mode="edit" taskId={id} initialTask={task} />
    </Suspense>
  );
}
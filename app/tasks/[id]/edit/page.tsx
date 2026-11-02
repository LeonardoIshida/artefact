import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { TRPCError } from "@trpc/server";
import { createServerCaller } from "@/server/caller";
import TaskForm from "../../_components/TaskForm";

export const instant = false;

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caller = await createServerCaller();
  try {
    const task = await caller.tasks.get({ id });
    return (
      <Suspense fallback={null}>
        <TaskForm mode="edit" initialTask={task} />
      </Suspense>
    );
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) {
      redirect("/tasks");
    }
    throw error;
  }
}
"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import type { Task } from "@/shared/task";
import TransientMessage from "@/components/TransientMessage";
import { parseTrpcError } from "@/lib/parse-trpc-error";
import TaskBoard from "./TaskBoard";

interface TaskListProps {
  initialTasks: Task[];
}

export default function TaskList({ initialTasks }: TaskListProps) {
  const utils = trpc.useUtils();
  const query = trpc.tasks.list.useQuery(undefined, { initialData: initialTasks });
  const [transient, setTransient] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryDeleteId, setRetryDeleteId] = useState<string | null>(null);

  const deleteMutation = trpc.tasks.delete.useMutation();

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      await deleteMutation.mutateAsync({ id });
      await utils.tasks.list.invalidate();
      setTransient({ kind: "success", message: "Task deleted" });
      setRetryDeleteId(null);
    } catch (error) {
      const parsed = parseTrpcError(error);
      setTransient({ kind: "error", message: parsed.message });
      setRetryDeleteId(id);
    } finally {
      setDeletingId(null);
    }
  };

  const tasks = query.data ?? initialTasks;

  const transientEl = transient && (
    <TransientMessage
      message={transient.message}
      kind={transient.kind}
      onDismiss={() => setTransient(null)}
      onRetry={
        transient.kind === "error" && retryDeleteId
          ? () => {
              void handleDelete(retryDeleteId);
            }
          : undefined
      }
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {transientEl}
      <TaskBoard
        tasks={tasks}
        deletingId={deletingId}
        onDelete={handleDelete}
      />
    </div>
  );
}

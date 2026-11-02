"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/app/providers";
import type { Task } from "@/shared/task";
import TaskListItem from "./TaskListItem";
import TransientMessage from "@/components/TransientMessage";
import { parseTrpcError } from "@/lib/parse-trpc-error";

interface TaskListProps {
  initialTasks: Task[];
}

export default function TaskList({ initialTasks }: TaskListProps) {
  const utils = trpc.useUtils();
  const query = trpc.tasks.list.useQuery(undefined, { initialData: initialTasks });
  const [transient, setTransient] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryDeleteId, setRetryDeleteId] = useState<string | null>(null);

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setTransient({ kind: "success", message: "Task deleted" });
      setRetryDeleteId(null);
    },
    onError: (error) => {
      const parsed = parseTrpcError(error);
      setTransient({ kind: "error", message: parsed.message });
      setRetryDeleteId(deletingId);
    },
    onSettled: () => setDeletingId(null),
  });

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const tasks = query.data ?? initialTasks;

  const transientEl = transient ? (
    <TransientMessage
      message={transient.message}
      kind={transient.kind}
      onDismiss={() => setTransient(null)}
      onRetry={
        transient.kind === "error" && retryDeleteId
          ? () => {
              setDeletingId(retryDeleteId);
              deleteMutation.mutate({ id: retryDeleteId });
            }
          : undefined
      }
    />
  ) : null;

  if (tasks.length === 0) {
    return (
      <div>
        <p>No tasks yet.</p>
        <Link href="/tasks/new">Create one</Link>
        {transientEl}
      </div>
    );
  }

  return (
    <div>
      {transientEl}
      <ul>
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            onDelete={handleDelete}
            isDeleting={deletingId === task.id && deleteMutation.isPending}
          />
        ))}
      </ul>
    </div>
  );
}
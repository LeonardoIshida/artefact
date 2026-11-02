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

  const deleteMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setTransient({ kind: "success", message: "Task deleted" });
    },
    onError: (error) => {
      const parsed = parseTrpcError(error);
      setTransient({ kind: "error", message: parsed.message });
    },
    onSettled: () => setDeletingId(null),
  });

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const tasks = query.data ?? initialTasks;

  if (tasks.length === 0) {
    return (
      <div>
        <p>No tasks yet.</p>
        <Link href="/tasks/new">Create one</Link>
        {transient ? (
          <TransientMessage
            message={transient.message}
            kind={transient.kind}
            onDismiss={() => setTransient(null)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {transient ? (
        <TransientMessage
          message={transient.message}
          kind={transient.kind}
          onDismiss={() => setTransient(null)}
        />
      ) : null}
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
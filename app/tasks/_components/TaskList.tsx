"use client";

import { useState } from "react";
import { trpc } from "@/app/providers";
import type { Task, TaskStatus } from "@/shared/task";
import TransientMessage from "@/components/TransientMessage";
import { parseTrpcError } from "@/lib/parse-trpc-error";
import TaskBoard from "./TaskBoard";

export interface LaneState {
  tasks: Task[];
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

export default function TaskList() {
  const [transient, setTransient] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryDeleteId, setRetryDeleteId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // One infinite query per status lane.
  const todoQuery = trpc.tasks.list.useInfiniteQuery(
    { status: "todo" },
    { getNextPageParam: (page) => page.nextCursor ?? undefined, initialCursor: null },
  );
  const inProgressQuery = trpc.tasks.list.useInfiniteQuery(
    { status: "in_progress" },
    { getNextPageParam: (page) => page.nextCursor ?? undefined, initialCursor: null },
  );
  const doneQuery = trpc.tasks.list.useInfiniteQuery(
    { status: "done" },
    { getNextPageParam: (page) => page.nextCursor ?? undefined, initialCursor: null },
  );

  const lanes: Record<TaskStatus, LaneState> = {
    todo: {
      tasks: todoQuery.data?.pages.flatMap((p: { items: Task[] }) => p.items) ?? [],
      isFetchingNextPage: todoQuery.isFetchingNextPage,
      hasNextPage: todoQuery.hasNextPage ?? false,
      isError: todoQuery.isError,
      error: (todoQuery.error as Error | null),
      fetchNextPage: () => { void todoQuery.fetchNextPage(); },
      refetch: () => { void todoQuery.refetch(); },
    },
    in_progress: {
      tasks: inProgressQuery.data?.pages.flatMap((p: { items: Task[] }) => p.items) ?? [],
      isFetchingNextPage: inProgressQuery.isFetchingNextPage,
      hasNextPage: inProgressQuery.hasNextPage ?? false,
      isError: inProgressQuery.isError,
      error: (inProgressQuery.error as Error | null),
      fetchNextPage: () => { void inProgressQuery.fetchNextPage(); },
      refetch: () => { void inProgressQuery.refetch(); },
    },
    done: {
      tasks: doneQuery.data?.pages.flatMap((p: { items: Task[] }) => p.items) ?? [],
      isFetchingNextPage: doneQuery.isFetchingNextPage,
      hasNextPage: doneQuery.hasNextPage ?? false,
      isError: doneQuery.isError,
      error: (doneQuery.error as Error | null),
      fetchNextPage: () => { void doneQuery.fetchNextPage(); },
      refetch: () => { void doneQuery.refetch(); },
    },
  };

  const deleteMutation = trpc.tasks.delete.useMutation();

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync({ id });
      // Reset all lanes: discard accumulated pages and reload from first page.
      await Promise.all([
        utils.tasks.list.reset({ status: "todo" }),
        utils.tasks.list.reset({ status: "in_progress" }),
        utils.tasks.list.reset({ status: "done" }),
      ]);
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

  const transientEl = transient ? (
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
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {transientEl}
      <TaskBoard
        lanes={lanes}
        deletingId={deletingId}
        onDelete={handleDelete}
      />
    </div>
  );
}
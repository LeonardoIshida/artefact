"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/shared/task";
import type { LaneState } from "./TaskList";
import DeleteTaskDialog from "./DeleteTaskDialog";
import TaskCard from "./TaskCard";
import TaskDetailDialog from "./TaskDetailDialog";
import Spinner from "@/components/Spinner";

interface TaskBoardProps {
  lanes: Record<TaskStatus, LaneState>;
  deletingId: string | null;
  movingId: string | null;
  onDelete: (taskId: string) => Promise<void>;
  onMoveTask: (task: Task, newStatus: TaskStatus) => Promise<void>;
}

const STATUS_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: TASK_STATUS_LABELS.todo },
  { status: "in_progress", label: TASK_STATUS_LABELS.in_progress },
  { status: "done", label: TASK_STATUS_LABELS.done },
];

function useLaneInfiniteScroll(
  status: TaskStatus,
  lane: LaneState,
  containerRef: React.RefObject<HTMLDivElement | null>,
  sentinelRef: React.RefObject<HTMLDivElement | null>,
) {
  const fetchingRef = useRef(false);
  // Keep the latest lane in a ref so callbacks stay stable across renders
  // instead of tearing down the IntersectionObserver on every lane update.
  const laneRef = useRef(lane);
  useEffect(() => {
    laneRef.current = lane;
  });

  const tryFetch = useCallback(() => {
    const currentLane = laneRef.current;
    if (fetchingRef.current) return;
    if (!currentLane.hasNextPage) return;
    if (currentLane.isFetchingNextPage) return;
    fetchingRef.current = true;
    currentLane.fetchNextPage();
  }, []);

  // Track desktop (xl) so the observer root is recomputed on resize.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 1280px)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(min-width: 1280px)");
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const root = isDesktop ? containerRef.current : null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            tryFetch();
          }
        }
      },
      { root, rootMargin: "100px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [isDesktop, containerRef, sentinelRef, tryFetch]);

  // Reset fetching lock when fetch completes, and check if sentinel is still visible.
  useEffect(() => {
    if (lane.isFetchingNextPage) return;
    fetchingRef.current = false;
    const sentinel = sentinelRef.current;
    if (!sentinel || !lane.hasNextPage) return;
    const rect = sentinel.getBoundingClientRect();
    const root = containerRef.current;
    let inView = false;
    if (root) {
      const rootRect = root.getBoundingClientRect();
      inView = rect.top < rootRect.bottom && rect.bottom > rootRect.top;
    } else {
      inView = rect.top < window.innerHeight && rect.bottom > 0;
    }
    if (inView) {
      tryFetch();
    }
  }, [lane.isFetchingNextPage, lane.hasNextPage, sentinelRef, containerRef, tryFetch]);
}

function LaneSentinel({
  status,
  lane,
  containerRef,
}: {
  status: TaskStatus;
  lane: LaneState;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useLaneInfiniteScroll(status, lane, containerRef, sentinelRef);

  if (!lane.hasNextPage) return null;

  return (
    <div ref={sentinelRef} className="shrink-0 flex flex-col items-center gap-2 py-2">
      {lane.isFetchingNextPage ? (
        <Spinner label={`Loading more ${status} tasks`} />
      ) : (
        <button
          type="button"
          onClick={() => lane.fetchNextPage()}
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Load more
        </button>
      )}
      {lane.isError ? (
        <div role="alert" className="text-sm text-destructive">
          {lane.error?.message ?? "Failed to load more tasks"}
          <button
            type="button"
            onClick={() => lane.refetch()}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DroppableColumn({
  status,
  containerRef,
  children,
}: {
  status: TaskStatus;
  containerRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const refCallback = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    containerRef.current = node;
  };
  return (
    <CardContent
      ref={refCallback}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3",
        isOver && "ring-2 ring-primary bg-primary/5",
      )}
    >
      {children}
    </CardContent>
  );
}

export default function TaskBoard({
  lanes,
  deletingId,
  movingId,
  onDelete,
  onMoveTask,
}: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    const overId = event.over?.id;
    setActiveTask(null);
    if (!task || !overId) return;
    const targetStatus = overId as TaskStatus;
    if (task.status === targetStatus) return;
    if (movingId) return;
    void onMoveTask(task, targetStatus);
  };

  const requestDelete = (task: Task) => {
    setSelectedTask(null);
    setDeleteTarget(task);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  };

  const todoContainerRef = useRef<HTMLDivElement>(null);
  const inProgressContainerRef = useRef<HTMLDivElement>(null);
  const doneContainerRef = useRef<HTMLDivElement>(null);
  const containerRefs = useMemo(
    () => ({
      todo: todoContainerRef,
      in_progress: inProgressContainerRef,
      done: doneContainerRef,
    }),
    [],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <>
        <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:min-h-0 xl:flex-1 xl:auto-rows-fr xl:grid-cols-[0.75fr_repeat(3,minmax(0,1fr))]">
        <section
          aria-labelledby="new-task-column-heading"
          className="h-full min-h-48"
        >
          <h2 id="new-task-column-heading" className="sr-only">
            New Task
          </h2>
          <Link
            href="/tasks/new"
            className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-4 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-11 items-center justify-center rounded-full border border-dashed border-current">
              <Plus aria-hidden="true" className="size-5" />
            </span>
            <span className="text-sm font-medium">Create task</span>
          </Link>
        </section>

        {STATUS_COLUMNS.map(({ status, label }) => {
          const lane = lanes[status];
          const columnTasks = lane.tasks;

          return (
            <section key={status} aria-labelledby={`task-column-${status}`}>
              <Card className="h-full min-h-0 bg-muted/30">
                <CardHeader>
                  <h2
                    id={`task-column-${status}`}
                    className="font-heading text-base leading-snug font-medium"
                  >
                    {label}
                  </h2>
                </CardHeader>
                <DroppableColumn status={status} containerRef={containerRefs[status]}>
                  {lane.isError && columnTasks.length === 0 ? (
                    <div role="alert" className="shrink-0 text-sm text-destructive">
                      {lane.error?.message ?? "Failed to load tasks"}
                      <button
                        type="button"
                        onClick={() => lane.refetch()}
                        className="ml-2 underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : columnTasks.length === 0 ? (
                    <p className="shrink-0 rounded-lg border border-dashed bg-background px-3 py-6 text-center text-sm text-muted-foreground">
                      No tasks
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isDeleting={deletingId === task.id}
                        isMoving={movingId === task.id}
                        onOpen={setSelectedTask}
                        onDelete={requestDelete}
                      />
                    ))
                  )}
                  {columnTasks.length > 0 && lane.isError ? (
                    <div role="alert" className="shrink-0 text-sm text-destructive">
                      {lane.error?.message ?? "Failed to load more tasks"}
                      <button
                        type="button"
                        onClick={() => lane.refetch()}
                        className="ml-2 underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}
                  {columnTasks.length > 0 ? (
                    <LaneSentinel status={status} lane={lane} containerRef={containerRefs[status]} />
                  ) : null}
                  {lane.isFetchingNextPage && columnTasks.length > 0 ? (
                    <div className="shrink-0 flex justify-center py-2">
                      <Spinner label={`Loading more ${status} tasks`} />
                    </div>
                  ) : null}
              </DroppableColumn>
              </Card>
            </section>
          );
        })}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onDelete={requestDelete}
      />
      <DeleteTaskDialog
        task={deleteTarget}
        isPending={deletingId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
      <DragOverlay>
        {activeTask ? (
          <div className="w-64 rounded-xl border bg-card p-3 shadow-lg opacity-90">
            <p className="line-clamp-2 break-words font-medium text-foreground">
              {activeTask.title}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </>
    </DndContext>
  );
}
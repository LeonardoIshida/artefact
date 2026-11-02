import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  CardAction,
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import type { Task, TaskStatus } from "@/shared/task";
import DeleteTaskDialog from "./DeleteTaskDialog";
import TaskCard from "./TaskCard";
import TaskDetailDialog from "./TaskDetailDialog";

interface TaskBoardProps {
  tasks: Task[];
  deletingId: string | null;
  onDelete: (taskId: string) => Promise<void>;
}

const STATUS_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: TASK_STATUS_LABELS.done },
];

export default function TaskBoard({
  tasks,
  deletingId,
  onDelete,
}: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

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

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section aria-labelledby="new-task-column-heading">
          <Card className="h-full border-dashed bg-muted/30">
            <CardHeader>
              <h2
                id="new-task-column-heading"
                className="font-heading text-base leading-snug font-medium"
              >
                New Task
              </h2>
            </CardHeader>
            <CardContent>
              <Link
                href="/tasks/new"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-24 w-full flex-col gap-2 border-dashed",
                )}
              >
                <Plus aria-hidden="true" />
                Create task
              </Link>
            </CardContent>
          </Card>
        </section>

        {STATUS_COLUMNS.map(({ status, label }) => {
          const columnTasks = tasks.filter((task) => task.status === status);

          return (
            <section key={status} aria-labelledby={`task-column-${status}`}>
              <Card className="h-full bg-muted/30">
                <CardHeader>
                  <h2
                    id={`task-column-${status}`}
                    className="font-heading text-base leading-snug font-medium"
                  >
                    {label}
                  </h2>
                  <CardAction>
                    <Badge
                      variant="secondary"
                      aria-label={`${columnTasks.length} tasks`}
                    >
                      {columnTasks.length}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {columnTasks.length === 0 ? (
                    <p className="rounded-lg border border-dashed bg-background px-3 py-6 text-center text-sm text-muted-foreground">
                      No tasks
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isDeleting={deletingId === task.id}
                        onOpen={setSelectedTask}
                        onDelete={requestDelete}
                      />
                    ))
                  )}
                </CardContent>
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
    </>
  );
}

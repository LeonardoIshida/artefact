import Link from "next/link";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Spinner from "@/components/Spinner";
import type { Task } from "@/shared/task";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskCardProps {
  task: Task;
  isDeleting: boolean;
  isMoving: boolean;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskCard({
  task,
  isDeleting,
  isMoving,
  onOpen,
  onDelete,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isDeleting || isMoving,
  });

  const busy = isDeleting || isMoving;

  return (
    <Card size="sm" className={cn("transition-shadow hover:shadow-sm", isDragging && "opacity-40")}>
      <CardContent className="flex items-start gap-1">
        <button
          type="button"
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          aria-label={`Drag task: ${task.title}`}
          data-testid="drag-handle"
          disabled={busy}
          className="shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 inline-flex"
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-2 py-1 text-left hover:bg-transparent"
          aria-label={`View task details: ${task.title}`}
          onClick={() => onOpen(task)}
          disabled={busy}
        >
          <span className="flex min-w-0 flex-col items-start gap-2">
            <span className="line-clamp-2 break-words font-medium text-foreground">
              {task.title}
            </span>
            <TaskStatusBadge status={task.status} />
          </span>
        </Button>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/tasks/${task.id}/edit`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            aria-label={`Edit task: ${task.title}`}
          >
            <Pencil aria-hidden="true" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete task: ${task.title}`}
            disabled={busy}
            onClick={() => onDelete(task)}
          >
            {isDeleting ? (
              <Spinner label={`Deleting ${task.title}`} />
            ) : isMoving ? (
              <Spinner label={`Moving ${task.title}`} />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

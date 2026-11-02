import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Spinner from "@/components/Spinner";
import type { Task } from "@/shared/task";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskCardProps {
  task: Task;
  isDeleting: boolean;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskCard({
  task,
  isDeleting,
  onOpen,
  onDelete,
}: TaskCardProps) {
  return (
    <Card size="sm" className="transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start gap-1">
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-2 py-1 text-left hover:bg-transparent"
          aria-label={`View task details: ${task.title}`}
          onClick={() => onOpen(task)}
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
            disabled={isDeleting}
            onClick={() => onDelete(task)}
          >
            {isDeleting ? (
              <Spinner label={`Deleting ${task.title}`} />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASSES } from "@/lib/tag-colors";
import type { Task } from "@/shared/task";

interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  onDelete: (task: Task) => void;
}

export default function TaskDetailDialog({
  task,
  onClose,
  onDelete,
}: TaskDetailDialogProps) {
  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      {task ? (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-3">
              <DialogTitle>{task.title}</DialogTitle>
              {task.tags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {task.tags.map((tag) => (
                    <Badge
                      key={tag.name}
                      variant="outline"
                      className={TAG_COLOR_CLASSES[tag.color]}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <DialogDescription>
              {task.description ?? "No description"}
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">
                <time dateTime={task.createdAt} suppressHydrationWarning>
                  {new Date(task.createdAt).toLocaleString()}
                </time>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Last updated</dt>
              <dd className="text-sm">
                <time dateTime={task.updatedAt} suppressHydrationWarning>
                  {new Date(task.updatedAt).toLocaleString()}
                </time>
              </dd>
            </div>
          </dl>

          <DialogFooter>
            <Link
              href={`/tasks/${task.id}/edit`}
              className={cn(buttonVariants({ variant: "outline" }))}
              aria-label={`Edit task: ${task.title}`}
            >
              <Pencil aria-hidden="true" />
              Edit
            </Link>
            <Button
              type="button"
              variant="destructive"
              aria-label={`Delete task: ${task.title}`}
              onClick={() => onDelete(task)}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

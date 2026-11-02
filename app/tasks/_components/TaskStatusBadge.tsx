import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import type { TaskStatus } from "@/shared/task";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "border-status-todo/20 bg-status-todo/10 text-status-todo",
  in_progress:
    "border-status-in-progress/20 bg-status-in-progress/10 text-status-in-progress",
  done: "border-status-done/20 bg-status-done/10 text-status-done",
};

export default function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status]}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

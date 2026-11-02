import Link from "next/link";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import type { Task } from "@/shared/task";
import DeleteTaskButton from "./DeleteTaskButton";

interface TaskListItemProps {
  task: Task;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export default function TaskListItem({ task, onDelete, isDeleting }: TaskListItemProps) {
  return (
    <li>
      <Link href={`/tasks/${task.id}/edit`}>{task.title}</Link>
      {task.description ? <p>{task.description}</p> : null}
      <span>{TASK_STATUS_LABELS[task.status]}</span>
      <time dateTime={task.createdAt} suppressHydrationWarning>
        {new Date(task.createdAt).toLocaleString()}
      </time>
      <time dateTime={task.updatedAt} suppressHydrationWarning>
        {new Date(task.updatedAt).toLocaleString()}
      </time>
      <DeleteTaskButton taskId={task.id} onDelete={onDelete} isDeleting={isDeleting} />
    </li>
  );
}
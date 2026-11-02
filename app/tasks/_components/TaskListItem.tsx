import Link from "next/link";
import type { Task } from "@/shared/task";
import DeleteTaskButton from "./DeleteTaskButton";

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

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
      <span>{STATUS_LABELS[task.status]}</span>
      <time dateTime={task.createdAt}>{new Date(task.createdAt).toLocaleString()}</time>
      <time dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleString()}</time>
      <DeleteTaskButton taskId={task.id} onDelete={onDelete} isDeleting={isDeleting} />
    </li>
  );
}
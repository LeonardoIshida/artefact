import type { Metadata } from "next";
import TaskForm from "../_components/TaskForm";

export const metadata: Metadata = {
  title: "New Task | Artefact",
};

export default function NewTaskPage() {
  return <TaskForm mode="create" />;
}

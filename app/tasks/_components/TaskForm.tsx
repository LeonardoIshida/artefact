"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";
import type { Task, TaskStatus } from "@/shared/task";
import { parseCreateTaskInput, parseUpdateTaskInput, ValidationFailed } from "@/shared/task";
import { parseTrpcError } from "@/lib/parse-trpc-error";
import FieldError from "@/components/FieldError";
import StatusBanner from "@/components/StatusBanner";
import Spinner from "@/components/Spinner";
import Link from "next/link";

interface TaskFormProps {
  mode: "create" | "edit";
  taskId?: string;
  initialTask?: Task;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

function validate(
  mode: "create" | "edit",
  taskId: string | undefined,
  title: string,
  description: string,
  status: TaskStatus,
): Record<string, string> {
  try {
    if (mode === "create") {
      parseCreateTaskInput({ title, description });
    } else {
      parseUpdateTaskInput({
        id: taskId,
        title,
        description: description.trim() === "" ? null : description,
        status,
      });
    }
    return {};
  } catch (error) {
    if (error instanceof ValidationFailed) return error.fieldErrors;
    return {};
  }
}

export default function TaskForm({ mode, taskId, initialTask }: TaskFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const seededRef = useRef(false);

  // Seed form state once the task is available (edit mode).
  useEffect(() => {
    if (isEdit && initialTask && !seededRef.current) {
      setTitle(initialTask.title);
      setDescription(initialTask.description ?? "");
      setStatus(initialTask.status);
      seededRef.current = true;
    }
  }, [isEdit, initialTask]);

  // Debounced validation.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFieldErrors(validate(mode, taskId, title, description, status));
    }, 300);
    return () => clearTimeout(handle);
  }, [mode, taskId, title, description, status]);

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => router.push("/tasks"),
    onError: (error) => {
      const parsed = parseTrpcError(error);
      setFieldErrors((prev) => ({ ...prev, ...Object.fromEntries(parsed.fieldErrors.map((fe) => [fe.field, fe.message])) }));
      setBanner(parsed.fieldErrors.length === 0 ? parsed.message : null);
    },
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => router.push("/tasks"),
    onError: (error) => {
      const parsed = parseTrpcError(error);
      setFieldErrors((prev) => ({ ...prev, ...Object.fromEntries(parsed.fieldErrors.map((fe) => [fe.field, fe.message])) }));
      setBanner(parsed.fieldErrors.length === 0 ? parsed.message : null);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validate(mode, taskId, title, description, status);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBanner(null);
    if (mode === "create") {
      createMutation.mutate({ title, description: description === "" ? undefined : description });
    } else {
      updateMutation.mutate({
        id: taskId as string,
        title,
        description: description.trim() === "" ? null : description,
        status,
      });
    }
  };

  const handleTitleBlur = () => {
    setFieldErrors(validate(mode, taskId, title, description, status));
  };

  if (isEdit && !initialTask) {
    return <Spinner label="Loading task" />;
  }

  return (
    <form onSubmit={handleSubmit}>
      {banner ? <StatusBanner kind="error" message={banner} /> : null}

      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          disabled={isSubmitting}
        />
        <FieldError message={fieldErrors.title} />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
        <FieldError message={fieldErrors.description} />
      </div>

      {isEdit ? (
        <div>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            disabled={isSubmitting}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.status} />
        </div>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner label="Saving" /> : mode === "create" ? "Create" : "Save"}
      </button>

      <Link href="/tasks">Cancel</Link>
    </form>
  );
}
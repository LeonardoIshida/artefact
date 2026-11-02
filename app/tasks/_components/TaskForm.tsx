"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";
import type { Task, TaskStatus } from "@/shared/task";
import { parseCreateTaskInput, parseUpdateTaskInput, ValidationFailed } from "@/shared/task";
import { parseTrpcError } from "@/lib/parse-trpc-error";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import FieldError from "@/components/FieldError";
import StatusBanner from "@/components/StatusBanner";
import Spinner from "@/components/Spinner";
import Link from "next/link";

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
}

interface TaskFormProps {
  mode: "create" | "edit";
  initialTask?: Task;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: TASK_STATUS_LABELS.todo },
  { value: "in_progress", label: TASK_STATUS_LABELS.in_progress },
  { value: "done", label: TASK_STATUS_LABELS.done },
];

function validate(
  mode: "create" | "edit",
  taskId: string | undefined,
  state: FormState,
): Record<string, string> {
  try {
    if (mode === "create") {
      parseCreateTaskInput({ title: state.title, description: state.description });
    } else {
      parseUpdateTaskInput({
        id: taskId,
        title: state.title,
        description: state.description.trim() === "" ? null : state.description,
        status: state.status,
      });
    }
    return {};
  } catch (error) {
    if (error instanceof ValidationFailed) return error.fieldErrors;
    return {};
  }
}

function mergeFieldErrors(
  base: Record<string, string>,
  incoming: { field: string; message: string }[],
): Record<string, string> {
  const next = { ...base };
  for (const fe of incoming) {
    // Preserve every error; if multiple target the same field, join messages
    // so the array contract (Spec 06) is not collapsed into a single value.
    if (next[fe.field]) {
      next[fe.field] = `${next[fe.field]}; ${fe.message}`;
    } else {
      next[fe.field] = fe.message;
    }
  }
  return next;
}

export default function TaskForm({ mode, initialTask }: TaskFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [state, setState] = useState<FormState>({
    title: "",
    description: "",
    status: "todo",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (isEdit && initialTask && !seededRef.current) {
      setState({
        title: initialTask.title,
        description: initialTask.description ?? "",
        status: initialTask.status,
      });
      seededRef.current = true;
    }
  }, [isEdit, initialTask]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setFieldErrors(validate(mode, initialTask?.id, state));
    }, 300);
    return () => clearTimeout(handle);
  }, [mode, initialTask?.id, state]);

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => router.push("/tasks"),
    onError: (error) => handleError(error),
  });

  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => router.push("/tasks"),
    onError: (error) => handleError(error),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleError = (error: unknown) => {
    const parsed = parseTrpcError(error);
    setFieldErrors((prev) => mergeFieldErrors(prev, parsed.fieldErrors));
    setBanner(parsed.fieldErrors.length === 0 ? parsed.message : null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validate(mode, initialTask?.id, state);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBanner(null);
    if (mode === "create") {
      createMutation.mutate({ title: state.title, description: state.description === "" ? undefined : state.description });
    } else {
      updateMutation.mutate({
        id: initialTask?.id as string,
        title: state.title,
        description: state.description.trim() === "" ? null : state.description,
        status: state.status,
      });
    }
  };

  const handleBlur = () => {
    setFieldErrors(validate(mode, initialTask?.id, state));
  };

  const handleRetry = () => {
    handleSubmit(new Event("submit") as unknown as React.FormEvent);
  };

  if (isEdit && !initialTask) {
    return <Spinner label="Loading task" />;
  }

  return (
    <form onSubmit={handleSubmit}>
      {banner ? <StatusBanner kind="error" message={banner} onRetry={handleRetry} /> : null}

      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          onBlur={handleBlur}
          disabled={isSubmitting}
        />
        <FieldError message={fieldErrors.title} />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
          onBlur={handleBlur}
          disabled={isSubmitting}
        />
        <FieldError message={fieldErrors.description} />
      </div>

      {isEdit ? (
        <div>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={state.status}
            onChange={(e) => setState((s) => ({ ...s, status: e.target.value as TaskStatus }))}
            onBlur={handleBlur}
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
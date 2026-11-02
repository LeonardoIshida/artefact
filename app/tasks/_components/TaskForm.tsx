"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";
import type { Task, TaskStatus } from "@/shared/task";
import { parseCreateTaskInput, parseUpdateTaskInput, ValidationFailed } from "@/shared/task";
import { parseTrpcError } from "@/lib/parse-trpc-error";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import type { ParsedFieldError } from "@/lib/parse-trpc-error";
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
): ParsedFieldError[] {
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
    return [];
  } catch (error) {
    if (error instanceof ValidationFailed) {
      return Object.entries(error.fieldErrors).map(([field, message]) => ({
        field,
        message,
      }));
    }
    return [];
  }
}

export default function TaskForm({ mode, initialTask }: TaskFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [state, setState] = useState<FormState>({
    title: "",
    description: "",
    status: "todo",
  });
  const [fieldErrors, setFieldErrors] = useState<ParsedFieldError[]>([]);
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
    setFieldErrors(parsed.fieldErrors);
    setBanner(parsed.fieldErrors.length === 0 ? parsed.message : null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validate(mode, initialTask?.id, state);
    setFieldErrors(errors);
    if (errors.length > 0) return;

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
        <FieldError field="title" fieldErrors={fieldErrors} />
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
        <FieldError field="description" fieldErrors={fieldErrors} />
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
          <FieldError field="status" fieldErrors={fieldErrors} />
        </div>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner label="Saving" /> : mode === "create" ? "Create" : "Save"}
      </button>

      <Link href="/tasks">Cancel</Link>
    </form>
  );
}

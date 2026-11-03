"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight } from "lucide-react";
import { trpc } from "@/app/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FieldError from "@/components/FieldError";
import Spinner from "@/components/Spinner";
import StatusBanner from "@/components/StatusBanner";
import { parseTrpcError, type ParsedFieldError } from "@/lib/parse-trpc-error";
import { TASK_STATUS_LABELS } from "@/lib/task-status-labels";
import {
  parseCreateTaskInput,
  parseUpdateTaskInput,
  ValidationFailed,
  type Task,
  type TaskStatus,
} from "@/shared/task";
import TaskStatusBadge from "./TaskStatusBadge";

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
}

interface TaskFormProps {
  mode: "create" | "edit";
  initialTask?: Task;
}

interface ComparisonFieldProps {
  field: string;
  id: string;
  label: string;
  currentValue: React.ReactNode;
  isChanged: boolean;
  fieldErrors: readonly ParsedFieldError[];
  children: React.ReactNode;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: TASK_STATUS_LABELS.todo },
  { value: "in_progress", label: TASK_STATUS_LABELS.in_progress },
  { value: "done", label: TASK_STATUS_LABELS.done },
];

function createInitialState(mode: TaskFormProps["mode"], task?: Task): FormState {
  if (mode === "edit" && task) {
    return {
      title: task.title,
      description: task.description ?? "",
      status: task.status,
    };
  }

  return { title: "", description: "", status: "todo" };
}

function normalizeDescription(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function validate(
  mode: TaskFormProps["mode"],
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
        description: normalizeDescription(state.description),
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

function isTaskStatus(value: string | null): value is TaskStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

function ComparisonField({
  field,
  id,
  label,
  currentValue,
  isChanged,
  fieldErrors,
  children,
}: ComparisonFieldProps) {
  return (
    <div className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
      <div className="space-y-1 rounded-lg bg-muted/40 px-3 py-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Current {label.toLowerCase()}
        </p>
        <div className="max-h-20 min-h-8 overflow-y-auto break-words whitespace-pre-wrap text-sm">
          {currentValue}
        </div>
      </div>
      <ArrowDown
        aria-hidden="true"
        className="mx-auto size-4 text-muted-foreground md:hidden"
      />
      <ArrowRight
        aria-hidden="true"
        className="hidden size-4 text-muted-foreground md:block"
      />
      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>New {label.toLowerCase()}</Label>
          {isChanged ? <Badge variant="secondary">Changed</Badge> : null}
        </div>
        {children}
        <FieldError field={field} fieldErrors={fieldErrors} />
      </div>
    </div>
  );
}

export default function TaskForm({ mode, initialTask }: TaskFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = mode === "edit";
  const initialState = createInitialState(mode, initialTask);
  const [state, setState] = useState<FormState>(() => initialState);
  const [fieldErrors, setFieldErrors] = useState<ParsedFieldError[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [shouldValidate, setShouldValidate] = useState(false);

  useEffect(() => {
    if (!shouldValidate) return;
    const timer = setTimeout(() => {
      setFieldErrors(validate(mode, initialTask?.id, state));
    }, 300);
    return () => clearTimeout(timer);
  }, [initialTask?.id, mode, shouldValidate, state]);

  const handleError = (error: unknown) => {
    const parsed = parseTrpcError(error);
    setFieldErrors(parsed.fieldErrors);
    setBanner(parsed.fieldErrors.length === 0 ? parsed.message : null);
  };

  const feedbackQuery = mode === "create" ? "created" : "updated";
  const navigateAfterSave = () =>
    router.push(`/tasks?feedback=${feedbackQuery}`, { scroll: false });

  const resetLanes = async () => {
    await Promise.all([
      utils.tasks.list.reset({ status: "todo" }),
      utils.tasks.list.reset({ status: "in_progress" }),
      utils.tasks.list.reset({ status: "done" }),
    ]);
  };

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: async () => {
      await resetLanes();
      navigateAfterSave();
    },
    onError: handleError,
  });
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: async () => {
      await resetLanes();
      navigateAfterSave();
    },
    onError: handleError,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasFieldError = (field: string) =>
    fieldErrors.some((error) => error.field === field);
  const isTitleChanged =
    isEdit && state.title.trim() !== initialState.title;
  const isDescriptionChanged =
    isEdit &&
    normalizeDescription(state.description) !==
      normalizeDescription(initialState.description);
  const isStatusChanged = isEdit && state.status !== initialState.status;

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setState((current) => ({ ...current, [field]: value }));
    setShouldValidate(true);
    setBanner(null);
  };

  const submit = () => {
    const errors = validate(mode, initialTask?.id, state);
    setFieldErrors(errors);
    setShouldValidate(true);
    if (errors.length > 0) return;

    setBanner(null);
    if (mode === "create") {
      createMutation.mutate({
        title: state.title,
        description: state.description === "" ? undefined : state.description,
      });
      return;
    }

    updateMutation.mutate({
      id: initialTask?.id as string,
      title: state.title,
      description: normalizeDescription(state.description),
      status: state.status,
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleCancel = () => {
    setState(initialState);
    setFieldErrors([]);
    setBanner(null);
    setShouldValidate(false);
    router.push("/tasks");
  };

  const handleBlur = () => {
    setShouldValidate(true);
    setFieldErrors(validate(mode, initialTask?.id, state));
  };

  if (isEdit && !initialTask) {
    return <Spinner label="Loading task" />;
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit task" : "Create task"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Compare the current values with your changes before updating."
            : "Add a title and any details you need."}
        </p>
      </header>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        {banner ? <StatusBanner kind="error" message={banner} onRetry={submit} /> : null}

        {isEdit && initialTask ? (
          <Card>
            <CardContent className="space-y-4 py-4">
              <ComparisonField
                field="title"
                id="new-title"
                label="Title"
                currentValue={initialTask.title}
                isChanged={isTitleChanged}
                fieldErrors={fieldErrors}
              >
                <Input
                  id="new-title"
                  value={state.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={handleBlur}
                  required
                  aria-required="true"
                  aria-invalid={hasFieldError("title")}
                  aria-describedby={
                    hasFieldError("title") ? "title-error" : undefined
                  }
                  disabled={isSubmitting}
                />
              </ComparisonField>

              <ComparisonField
                field="description"
                id="new-description"
                label="Description"
                currentValue={initialTask.description ?? "No description"}
                isChanged={isDescriptionChanged}
                fieldErrors={fieldErrors}
              >
                <Textarea
                  id="new-description"
                  className="max-h-24 overflow-y-auto"
                  value={state.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  onBlur={handleBlur}
                  aria-invalid={fieldErrors.some(
                    (error) => error.field === "description",
                  )}
                  aria-describedby={
                    hasFieldError("description")
                      ? "description-error"
                      : undefined
                  }
                  disabled={isSubmitting}
                />
              </ComparisonField>

              <ComparisonField
                field="status"
                id="new-status"
                label="Status"
                currentValue={<TaskStatusBadge status={initialTask.status} />}
                isChanged={isStatusChanged}
                fieldErrors={fieldErrors}
              >
                <Select
                  value={state.status}
                  onValueChange={(value) => {
                    if (isTaskStatus(value)) updateField("status", value);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="new-status"
                    aria-label="New status"
                    className="w-full"
                    aria-invalid={fieldErrors.some(
                      (error) => error.field === "status",
                    )}
                    aria-describedby={
                      hasFieldError("status") ? "status-error" : undefined
                    }
                >
                  <SelectValue>
                    {STATUS_OPTIONS.find((option) => option.value === state.status)
                      ?.label ?? "Select a status"}
                  </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ComparisonField>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={handleBlur}
                  required
                  aria-required="true"
                  aria-invalid={hasFieldError("title")}
                  aria-describedby={
                    hasFieldError("title") ? "title-error" : undefined
                  }
                  disabled={isSubmitting}
                />
                <FieldError field="title" fieldErrors={fieldErrors} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="max-h-24 overflow-y-auto"
                  value={state.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  onBlur={handleBlur}
                  aria-invalid={fieldErrors.some(
                    (error) => error.field === "description",
                  )}
                  aria-describedby={
                    hasFieldError("description")
                      ? "description-error"
                      : undefined
                  }
                  disabled={isSubmitting}
                />
                <FieldError field="description" fieldErrors={fieldErrors} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner label="Saving task" />
                {isEdit ? "Updating..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Update task"
            ) : (
              "Create task"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

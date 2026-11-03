import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Task } from "@/shared/task";
import TaskDetailDialog from "./TaskDetailDialog";

const task: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Plan the release",
  description: "Prepare release notes",
  status: "in_progress",
  tags: [],
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

describe("TaskDetailDialog", () => {
  it("shows complete task details in a dialog", () => {
    render(
      <TaskDetailDialog task={task} onClose={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByRole("dialog", { name: "Plan the release" })).toBeInTheDocument();
    expect(screen.getByText("Prepare release notes")).toBeInTheDocument();
    expect(screen.getByText("Created").parentElement?.querySelector("time")).toHaveAttribute(
      "dateTime",
      task.createdAt,
    );
    expect(screen.getByText("Last updated").parentElement?.querySelector("time")).toHaveAttribute(
      "dateTime",
      task.updatedAt,
    );
  });

  it("links to the task edit page and can request deletion", () => {
    const onDelete = vi.fn();
    render(<TaskDetailDialog task={task} onClose={vi.fn()} onDelete={onDelete} />);

    expect(screen.getByRole("link", { name: "Edit task: Plan the release" })).toHaveAttribute(
      "href",
      `/tasks/${task.id}/edit`,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete task: Plan the release" }),
    );
    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it("renders a helpful description when the task has none", () => {
    render(
      <TaskDetailDialog
        task={{ ...task, description: null }}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Task } from "@/shared/task";
import DeleteTaskDialog from "./DeleteTaskDialog";

const task: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Plan the release",
  description: null,
  status: "todo",
  tags: [],
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

describe("DeleteTaskDialog", () => {
  it("names the task and offers cancel and delete actions", () => {
    render(
      <DeleteTaskDialog
        task={task}
        isPending={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Delete 'Plan the release'?",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls the cancel and delete actions", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DeleteTaskDialog
        task={task}
        isPending={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables both actions while deletion is pending", () => {
    render(
      <DeleteTaskDialog
        task={task}
        isPending
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deleting task" })).toBeDisabled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Task } from "@/shared/task";
import TaskCard from "./TaskCard";

const task: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Plan the release",
  description: "Prepare release notes",
  status: "in_progress",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

describe("TaskCard", () => {
  it("shows the title, status, and task actions without showing details", () => {
    render(
      <TaskCard
        task={task}
        isDeleting={false}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "View task details: Plan the release" }),
    ).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit task: Plan the release" })).toHaveAttribute(
      "href",
      `/tasks/${task.id}/edit`,
    );
    expect(
      screen.getByRole("button", { name: "Delete task: Plan the release" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Prepare release notes")).not.toBeInTheDocument();
  });

  it("opens task details when its main card action is activated", () => {
    const onOpen = vi.fn();
    render(
      <TaskCard task={task} isDeleting={false} onOpen={onOpen} onDelete={vi.fn()} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "View task details: Plan the release" }),
    );

    expect(onOpen).toHaveBeenCalledWith(task);
  });

  it("requests deletion through the task action", () => {
    const onDelete = vi.fn();
    render(<TaskCard task={task} isDeleting={false} onOpen={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete task: Plan the release" }));

    expect(onDelete).toHaveBeenCalledWith(task);
  });

  it("disables deletion while the task is being deleted", () => {
    render(<TaskCard task={task} isDeleting onOpen={vi.fn()} onDelete={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Delete task: Plan the release" }),
    ).toBeDisabled();
  });
});

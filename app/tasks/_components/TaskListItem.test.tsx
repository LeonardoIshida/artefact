import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskListItem from "./TaskListItem";
import type { Task } from "@/shared/task";

const task: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Buy milk",
  description: "2% fat",
  status: "todo",
  createdAt: "2026-11-02T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

describe("TaskListItem", () => {
  it("renders title, description, status label, and edit link", () => {
    render(<TaskListItem task={task} onDelete={vi.fn()} isDeleting={false} />);
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("2% fat")).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Buy milk" });
    expect(link).toHaveAttribute("href", `/tasks/${task.id}/edit`);
  });

  it("renders time elements with the ISO timestamps", () => {
    const { container } = render(<TaskListItem task={task} onDelete={vi.fn()} isDeleting={false} />);
    const times = container.querySelectorAll("time");
    expect(times).toHaveLength(2);
    expect(times[0]).toHaveAttribute("dateTime", task.createdAt);
    expect(times[1]).toHaveAttribute("dateTime", task.updatedAt);
  });

  it("renders null description gracefully", () => {
    const noDesc: Task = { ...task, description: null };
    render(<TaskListItem task={noDesc} onDelete={vi.fn()} isDeleting={false} />);
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.queryByText("2% fat")).not.toBeInTheDocument();
  });

  it("shows in-progress and done labels", () => {
    const inProgress: Task = { ...task, status: "in_progress" };
    const { unmount } = render(<TaskListItem task={inProgress} onDelete={vi.fn()} isDeleting={false} />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    unmount();
    const done: Task = { ...task, status: "done" };
    render(<TaskListItem task={done} onDelete={vi.fn()} isDeleting={false} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});
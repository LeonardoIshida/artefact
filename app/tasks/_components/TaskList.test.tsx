import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskList from "./TaskList";
import { TRPCProvider } from "@/app/providers";
import type { Task } from "@/shared/task";

const task: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Buy milk",
  description: null,
  status: "todo",
  createdAt: "2026-11-02T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

describe("TaskList", () => {
  it("shows the Kanban lanes and create action when there are no tasks", () => {
    render(
      <TRPCProvider>
        <TaskList initialTasks={[]} />
      </TRPCProvider>,
    );
    expect(screen.getByRole("link", { name: "Create task" })).toHaveAttribute(
      "href",
      "/tasks/new",
    );
    for (const column of ["To Do", "In Progress", "Done"]) {
      expect(screen.getByRole("region", { name: column })).toBeInTheDocument();
    }
  });

  it("renders provided tasks", () => {
    render(
      <TRPCProvider>
        <TaskList initialTasks={[task]} />
      </TRPCProvider>,
    );
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });
});

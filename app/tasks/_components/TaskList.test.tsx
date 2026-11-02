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
  it("shows empty state when there are no tasks", () => {
    render(
      <TRPCProvider>
        <TaskList initialTasks={[]} />
      </TRPCProvider>,
    );
    expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create one/i })).toBeInTheDocument();
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
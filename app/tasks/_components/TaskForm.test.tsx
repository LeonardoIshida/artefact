import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TRPCProvider } from "@/app/providers";
import TaskForm from "./TaskForm";
import type { Task } from "@/shared/task";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}));


const sampleTask: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Buy milk",
  description: "2% fat",
  status: "in_progress",
  createdAt: "2026-11-02T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

describe("TaskForm (create mode)", () => {
  it("renders title and description inputs, no status select, Create button", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
  });

  it("shows a title error when submitting empty", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });
});


describe("TaskForm (edit mode)", () => {
  it("pre-fills title, description, and status from initialTask", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="edit" taskId={sampleTask.id} initialTask={sampleTask} />
      </TRPCProvider>,
    );
    expect(screen.getByDisplayValue("Buy milk")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2% fat")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("in_progress");
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("renders status select in edit mode", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="edit" taskId={sampleTask.id} initialTask={sampleTask} />
      </TRPCProvider>,
    );
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });
});

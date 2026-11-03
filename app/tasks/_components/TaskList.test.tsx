import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskList from "./TaskList";
import { TRPCProvider } from "@/app/providers";

describe("TaskList", () => {
  it("shows the Kanban lanes and create action", () => {
    render(
      <TRPCProvider>
        <TaskList />
      </TRPCProvider>,
    );
    expect(screen.getByRole("heading", { name: "Tasks", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create task" })).toHaveAttribute(
      "href",
      "/tasks/new",
    );
    for (const column of ["To do", "In progress", "Done"]) {
      expect(screen.getByRole("region", { name: column })).toBeInTheDocument();
    }
  });
});
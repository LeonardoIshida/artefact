import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TasksError from "./error";

describe("TasksError", () => {
  it("shows a recovery message and retries the task segment", () => {
    const retry = vi.fn();
    render(
      <TasksError error={new Error("private server detail")} retry={retry} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load tasks");
    expect(screen.queryByText("private server detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});

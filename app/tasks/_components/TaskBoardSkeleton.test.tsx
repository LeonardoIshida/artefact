import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskBoardSkeleton from "./TaskBoardSkeleton";

describe("TaskBoardSkeleton", () => {
  it("announces that the task board is loading", () => {
    render(<TaskBoardSkeleton />);

    expect(screen.getByRole("status", { name: "Loading tasks" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});

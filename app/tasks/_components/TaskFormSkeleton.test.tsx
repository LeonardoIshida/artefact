import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskFormSkeleton from "./TaskFormSkeleton";

describe("TaskFormSkeleton", () => {
  it("announces that the task form is loading", () => {
    render(<TaskFormSkeleton />);

    expect(
      screen.getByRole("status", { name: "Loading task form" }),
    ).toHaveAttribute("aria-busy", "true");
  });
});

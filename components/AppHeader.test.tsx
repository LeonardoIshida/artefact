import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppHeader from "./AppHeader";

const route = vi.hoisted(() => ({ pathname: "/tasks" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

describe("AppHeader", () => {
  beforeEach(() => {
    route.pathname = "/tasks";
  });

  it("provides navigation to the task list and task creation", () => {
    render(<AppHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Artefact" })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: "New Task" })).toHaveAttribute(
      "href",
      "/tasks/new",
    );
  });

  it("marks the current section as the active navigation link", () => {
    route.pathname = "/tasks/123e4567-e89b-12d3-a456-426614174000/edit";
    render(<AppHeader />);

    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "New Task" }),
    ).not.toHaveAttribute("aria-current", "page");
  });

  it("marks task creation active only on the new-task route", () => {
    route.pathname = "/tasks/new";
    render(<AppHeader />);

    expect(screen.getByRole("link", { name: "New Task" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Tasks" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

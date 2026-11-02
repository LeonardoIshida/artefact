import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeleteTaskButton from "./DeleteTaskButton";

describe("DeleteTaskButton", () => {
  it("shows a trash button initially", () => {
    render(<DeleteTaskButton taskId="abc" onDelete={vi.fn()} isDeleting={false} />);
    expect(screen.getByRole("button", { name: /delete task/i })).toBeInTheDocument();
  });

  it("reveals confirm controls on click and cancels", () => {
    render(<DeleteTaskButton taskId="abc" onDelete={vi.fn()} isDeleting={false} />);
    fireEvent.click(screen.getByRole("button", { name: /delete task/i }));
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("calls onDelete with taskId when confirmed", () => {
    const onDelete = vi.fn();
    render(<DeleteTaskButton taskId="abc" onDelete={onDelete} isDeleting={false} />);
    fireEvent.click(screen.getByRole("button", { name: /delete task/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledWith("abc");
  });

  it("disables trash button while deleting", () => {
    render(<DeleteTaskButton taskId="abc" onDelete={vi.fn()} isDeleting={true} />);
    expect(screen.getByRole("button", { name: /delete task/i })).toBeDisabled();
  });
});
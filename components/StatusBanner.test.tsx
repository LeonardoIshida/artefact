import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StatusBanner from "./StatusBanner";

describe("StatusBanner", () => {
  it("renders the message with role status for success", () => {
    render(<StatusBanner kind="success" message="Task created" />);
    expect(screen.getByText("Task created")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the message with role alert for error", () => {
    render(<StatusBanner kind="error" message="Something failed" />);
    expect(screen.getByText("Something failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("exposes a retry action when one is provided", () => {
    const onRetry = vi.fn();
    render(
      <StatusBanner kind="error" message="Request failed" onRetry={onRetry} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});

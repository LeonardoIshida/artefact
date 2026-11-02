import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TransientMessage from "./TransientMessage";

describe("TransientMessage", () => {
  it("renders the message", () => {
    render(<TransientMessage message="Deleted" />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("auto-dismisses after the duration and calls onDismiss", async () => {
    const onDismiss = vi.fn();
    render(<TransientMessage message="Deleted" duration={50} onDismiss={onDismiss} />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it("uses 3000ms by default", async () => {
    const onDismiss = vi.fn();
    render(<TransientMessage message="Deleted" onDismiss={onDismiss} />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });

  it("runs the retry action and dismisses after the user retries", () => {
    const onRetry = vi.fn();
    render(
      <TransientMessage
        message="Could not delete task"
        kind="error"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText("Could not delete task")).not.toBeInTheDocument();
  });
});

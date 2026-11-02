import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
});
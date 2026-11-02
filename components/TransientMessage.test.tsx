import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TransientMessage from "./TransientMessage";

describe("TransientMessage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the message", () => {
    render(<TransientMessage message="Deleted" />);
    expect(screen.getByRole("status")).toHaveTextContent("Deleted");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("auto-dismisses after the configured duration", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<TransientMessage message="Deleted" duration={50} onDismiss={onDismiss} />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("uses a five-second default duration", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<TransientMessage message="Deleted" onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("pauses the remaining duration while hovered and resumes on leave", () => {
    vi.useFakeTimers();
    render(<TransientMessage message="Deleted" duration={1000} />);
    const region = screen.getByRole("status").parentElement;

    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.mouseEnter(region!);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Deleted");

    fireEvent.mouseLeave(region!);
    act(() => {
      vi.advanceTimersByTime(599);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Deleted");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("pauses while a control in the message has focus", () => {
    vi.useFakeTimers();
    render(
      <TransientMessage
        message="Could not delete task"
        kind="error"
        duration={1000}
      />,
    );
    const closeButton = screen.getByRole("button", { name: "Dismiss message" });

    act(() => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.focus(closeButton);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not delete task");

    fireEvent.blur(closeButton, { relatedTarget: document.body });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can be dismissed manually", () => {
    const onDismiss = vi.fn();
    render(
      <TransientMessage message="Deleted" onDismiss={onDismiss} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
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

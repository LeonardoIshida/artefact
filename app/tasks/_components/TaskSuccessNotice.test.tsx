import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskSuccessNotice from "./TaskSuccessNotice";

const navigation = vi.hoisted(() => ({
  feedback: null as string | null,
  router: { replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "feedback" ? navigation.feedback : null),
  }),
  useRouter: () => navigation.router,
}));

describe("TaskSuccessNotice", () => {
  beforeEach(() => {
    navigation.feedback = null;
    navigation.router.replace.mockClear();
  });

  it("shows a transient creation message and removes the query on the next action", () => {
    navigation.feedback = "created";
    render(<TaskSuccessNotice />);

    expect(screen.getByRole("status")).toHaveTextContent("Task created");
    expect(navigation.router.replace).not.toHaveBeenCalled();

    fireEvent.click(document.body);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(navigation.router.replace).toHaveBeenCalledWith("/tasks", {
      scroll: false,
    });
  });

  it("shows a transient message after a task update", () => {
    navigation.feedback = "updated";
    render(<TaskSuccessNotice />);

    expect(screen.getByRole("status")).toHaveTextContent("Task updated");
  });

  it("renders nothing for unknown feedback values", () => {
    navigation.feedback = "unknown";
    const { container } = render(<TaskSuccessNotice />);

    expect(container).toBeEmptyDOMElement();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });
});

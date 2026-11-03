import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Task } from "@/shared/task";
import type { LaneState } from "./TaskList";
import TaskBoard from "./TaskBoard";

function makeLane(tasks: Task[] = []): LaneState {
  return {
    tasks,
    isFetchingNextPage: false,
    hasNextPage: false,
    isError: false,
    error: null,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
}

function makeLanes(tasks: Task[] = []): Record<"todo" | "in_progress" | "done", LaneState> {
  const byStatus: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) byStatus[t.status].push(t);
  return {
    todo: makeLane(byStatus.todo),
    in_progress: makeLane(byStatus.in_progress),
    done: makeLane(byStatus.done),
  };
}

describe("TaskBoard", () => {
  it("keeps the create lane and all status lanes visible when there are no tasks", () => {
    render(<TaskBoard lanes={makeLanes()} deletingId={null} movingId={null} onDelete={async () => {}} onMoveTask={async () => {}} />);

    expect(screen.getByRole("heading", { name: "Tasks", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New Task" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create task" })).toHaveAttribute(
      "href",
      "/tasks/new",
    );

    for (const status of ["To do", "In progress", "Done"]) {
      const column = screen.getByRole("region", { name: status });
      expect(within(column).getByText("No tasks")).toBeInTheDocument();
    }
  });

  it("groups tasks by status and preserves each status list's order", () => {
    const tasks: Task[] = [
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        title: "Newest todo",
        description: null,
        status: "todo",
        tags: [],
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-03T10:00:00.000Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174002",
        title: "Older todo",
        description: null,
        status: "todo",
        tags: [],
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-02T10:00:00.000Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174003",
        title: "Review design",
        description: null,
        status: "in_progress",
        tags: [],
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-03T09:00:00.000Z",
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174004",
        title: "Ship release",
        description: null,
        status: "done",
        tags: [],
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-02T09:00:00.000Z",
      },
    ];

    render(
      <TaskBoard
        lanes={makeLanes(tasks)}
        deletingId={null}
        movingId={null}
        onDelete={async () => {}}
        onMoveTask={async () => {}}
      />,
    );

    const todoColumn = screen.getByRole("region", { name: "To do" });
    expect(
      within(todoColumn)
        .getAllByRole("button", { name: /^View task details:/ })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["View task details: Newest todo", "View task details: Older todo"]);
    expect(
      within(screen.getByRole("region", { name: "In progress" })).getByText(
        "Review design",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Done" })).getByText(
        "Ship release",
      ),
    ).toBeInTheDocument();
  });

  it("opens the task detail dialog from a card without leaving the board", () => {
    const task: Task = {
      id: "123e4567-e89b-12d3-a456-426614174005",
      title: "Prepare demo",
      description: "Confirm the release notes",
      status: "todo",
      tags: [],
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-02T10:00:00.000Z",
    };
    render(
      <TaskBoard lanes={makeLanes([task])} deletingId={null} movingId={null} onDelete={async () => {}} onMoveTask={async () => {}} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "View task details: Prepare demo" }),
    );

    expect(screen.getByRole("dialog", { name: "Prepare demo" })).toBeInTheDocument();
    expect(screen.getByText("Confirm the release notes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "To do" })).toBeInTheDocument();
  });

  it("confirms deletion from a card before calling the delete operation", async () => {
    const task: Task = {
      id: "123e4567-e89b-12d3-a456-426614174006",
      title: "Archive project",
      description: null,
      status: "done",
      tags: [],
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-02T10:00:00.000Z",
    };
    const onDelete = vi.fn(async () => {});
    render(<TaskBoard lanes={makeLanes([task])} deletingId={null} movingId={null} onDelete={onDelete} onMoveTask={async () => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete task: Archive project" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Delete 'Archive project'?",
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(task.id));
  });

  it("routes deletion from the detail dialog through confirmation", async () => {
    const task: Task = {
      id: "123e4567-e89b-12d3-a456-426614174007",
      title: "Close the project",
      description: "Archive the final documents",
      status: "done",
      tags: [],
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-02T10:00:00.000Z",
    };
    const onDelete = vi.fn(async () => {});
    render(<TaskBoard lanes={makeLanes([task])} deletingId={null} movingId={null} onDelete={onDelete} onMoveTask={async () => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: "View task details: Close the project" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete task: Close the project" }),
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Delete 'Close the project'?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(task.id));
  });
});
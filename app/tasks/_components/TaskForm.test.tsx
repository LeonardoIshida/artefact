import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { POST } from "@/app/api/trpc/[trpc]/route";
import { TRPCProvider } from "@/app/providers";
import { createServerCaller } from "@/server/caller";
import TaskForm from "./TaskForm";
import type { Task } from "@/shared/task";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  redirect: vi.fn(),
}));

const sampleTask: Task = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Buy milk",
  description: "2% fat",
  status: "in_progress",
  tags: [],
  createdAt: "2026-11-02T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

beforeEach(() => {
  navigation.push.mockClear();
  navigation.replace.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function installInProcessTrpcFetch() {
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request
          ? input
          : new Request(new URL(String(input), "http://localhost"), init);
      return POST(request);
    },
  );
}

describe("TaskForm (create mode)", () => {
  it("renders a simple create form without comparison columns or status", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.queryByLabelText("New status")).not.toBeInTheDocument();
    expect(screen.queryByText("Current title")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows a title error when submitting empty", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    const title = screen.getByLabelText("Title");
    expect(title).toBeRequired();
    expect(title).toHaveAttribute("aria-required", "true");

    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "title-error");
    expect(document.getElementById("title-error")).toHaveTextContent(
      "Title is required",
    );
  });

  it("debounces validation while the user is typing", async () => {
    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "   " },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
  });

  it("clears a create draft and returns to the task board when canceled", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Draft task" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Draft notes" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigation.push).toHaveBeenCalledWith("/tasks");
  });

  it("returns to the board with creation feedback after a successful save", async () => {
    installInProcessTrpcFetch();

    render(
      <TRPCProvider>
        <TaskForm mode="create" />
      </TRPCProvider>,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Create a release checklist" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/tasks?feedback=created", {
        scroll: false,
      }),
    );
  });

  it("returns to the board with update feedback after a successful edit", async () => {
    installInProcessTrpcFetch();
    const caller = await createServerCaller();
    const task = await caller.tasks.create({ title: "Original title" });

    render(
      <TRPCProvider>
        <TaskForm mode="edit" initialTask={task} />
      </TRPCProvider>,
    );
    fireEvent.change(screen.getByLabelText("New title"), {
      target: { value: "Updated title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update task" }));

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/tasks?feedback=updated", {
        scroll: false,
      }),
    );
  });

  it("keeps the edit form visible and offers retry after a server failure", async () => {
    installInProcessTrpcFetch();
    const missingTask: Task = {
      ...sampleTask,
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    };
    render(
      <TRPCProvider>
        <TaskForm mode="edit" initialTask={missingTask} />
      </TRPCProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Task");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByLabelText("New title")).toHaveValue(sampleTask.title);
  });
});


describe("TaskForm (edit mode)", () => {
  it("shows current values alongside pre-filled editable values", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="edit" initialTask={sampleTask} />
      </TRPCProvider>,
    );
    expect(screen.getByText("Current title")).toBeInTheDocument();
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByLabelText("New title")).toHaveValue("Buy milk");
    expect(screen.getByText("Current description")).toBeInTheDocument();
    expect(screen.getByLabelText("New description")).toHaveValue("2% fat");
    expect(screen.getByText("Current status")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "New status" })).toHaveTextContent(
      "In progress",
    );
    expect(screen.getByRole("button", { name: "Update task" })).toBeInTheDocument();
  });

  it("returns to the task board when canceling an edit", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="edit" initialTask={sampleTask} />
      </TRPCProvider>,
    );
    fireEvent.change(screen.getByLabelText("New title"), {
      target: { value: "Buy eggs" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigation.push).toHaveBeenCalledWith("/tasks");
  });

  it("associates invalid edit fields with their error text", () => {
    render(
      <TRPCProvider>
        <TaskForm mode="edit" initialTask={sampleTask} />
      </TRPCProvider>,
    );
    const description = screen.getByLabelText("New description");
    fireEvent.change(description, {
      target: { value: "x".repeat(2001) },
    });
    fireEvent.blur(description);

    expect(description).toHaveAttribute("aria-invalid", "true");
    expect(description).toHaveAttribute(
      "aria-describedby",
      "description-error",
    );
    expect(document.getElementById("description-error")).toHaveTextContent(
      "Description must be at most 2000 characters",
    );
  });
});

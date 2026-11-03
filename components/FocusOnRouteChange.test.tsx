import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import FocusOnRouteChange from "./FocusOnRouteChange";

const route = vi.hoisted(() => ({ pathname: "/tasks" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

describe("FocusOnRouteChange", () => {
  beforeEach(() => {
    route.pathname = "/tasks";
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not steal focus on the initial page render", () => {
    render(
      <>
        <FocusOnRouteChange />
        <main id="main-content" tabIndex={-1}>
          Tasks
        </main>
      </>,
    );

    expect(document.activeElement).not.toHaveAttribute("id", "main-content");
  });

  it("moves focus to main after the route changes", () => {
    const { rerender } = render(
      <>
        <FocusOnRouteChange />
        <main id="main-content" tabIndex={-1}>
          Tasks
        </main>
      </>,
    );
    const main = document.getElementById("main-content");

    act(() => {
      route.pathname = "/tasks/new";
      rerender(
        <>
          <FocusOnRouteChange />
          <main id="main-content" tabIndex={-1}>
            New task
          </main>
        </>,
      );
    });

    expect(main).toHaveFocus();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SkipLink from "./SkipLink";

describe("SkipLink", () => {
  it("links to the main content target", () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Tasks
        </main>
      </>,
    );

    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
  });
});

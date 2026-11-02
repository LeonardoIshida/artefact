import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FieldError from "./FieldError";

describe("FieldError", () => {
  it("renders nothing when message is undefined", () => {
    const { container } = render(<FieldError message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message when provided", () => {
    render(<FieldError message="Title is required" />);
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });
});
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FieldError from "./FieldError";

describe("FieldError", () => {
  it("renders nothing when there are no messages", () => {
    const { container } = render(<FieldError field="title" fieldErrors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every message for its field and omits errors for other fields", () => {
    render(
      <FieldError
        field="title"
        fieldErrors={[
          { field: "title", message: "Title is required" },
          {
            field: "description",
            message: "Description must be at most 2000 characters",
          },
          { field: "title", message: "Title must be at most 200 characters" },
        ]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Title must be at most 200 characters",
    );
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(
      screen.getByText("Title must be at most 200 characters"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Description must be at most 2000 characters"),
    ).not.toBeInTheDocument();
  });
});

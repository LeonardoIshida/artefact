import { describe, expect, it } from "vitest";
import { metadata as taskMetadata } from "./page";
import { metadata as createMetadata } from "./new/page";
import { metadata as editMetadata } from "./[id]/edit/page";

describe("task page metadata", () => {
  it("identifies the list, create, and edit pages in their titles", () => {
    expect(taskMetadata.title).toBe("Tasks | Artefact");
    expect(createMetadata.title).toBe("New Task | Artefact");
    expect(editMetadata.title).toBe("Edit Task | Artefact");
  });
});

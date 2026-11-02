# Spec: Error Contract — Backend-to-Frontend Error Shape

Status: ready-for-agent
Scope: Backend item 6 — the error-shape contract for UI rendering: what the frontend receives on success and failure, how field errors are structured, and how the UI displays them.
Depends on: Spec 01 (Task domain — entity, input contracts, error taxonomy, validation rules); Spec 02 (Repository — TaskRepository interface); Spec 03 (tRPC infrastructure — error formatter, client factory); Spec 04 (Task procedures — error mapping, inline try/catch); Spec 05 (SSR bridge — SSR error handling, notFound + banner).
Sources: Grilling session (item 6, rounds 1); original PT-BR requirements preserved under `specs/source/`; frontend specs under `specs/frontend/`.

## Problem Statement

Artefact's backend defines error codes and field-level messages, and the frontend needs to display them — but without a single, precise contract for what an error looks like on the wire, the two sides will drift. The frontend spec assumes "validation failures arrive as a field-error map" and "mutation outcomes surface as a status banner," but the exact shape (array vs map, code vs message, success signal) is undefined. Without this contract, the UI will parse errors inconsistently, show wrong messages, or fail to highlight the right field.

## Solution

A single error contract that every tRPC procedure honors: success is implicit in resolution (the returned `Task` or void is the proof), failure is a tRPC error with a stable `code`, a human-readable `message`, and — for validation failures — an array of `{ field, message }` pairs in `data.fieldErrors`. The frontend reads this shape to render inline field errors, operation-level banners, or a 404 page, with no guesswork.

## User Stories

1. As an app user, I want to see exactly which field is invalid and why, so that I can fix my input without guessing.
2. As an app user, I want to see all validation errors at once, so that I can fix everything in a single pass instead of one field at a time.
3. As an app user, I want a clear message when a task I'm editing or deleting no longer exists, so that I understand what happened.
4. As an app user, I want a clear message when a network error or server failure occurs, so that I know the app had a problem and can retry.
5. As an app user, I want success to be obvious — the form submits, the list updates — without needing a separate "success" confirmation from the backend.
6. As an app user, I want transient error and success messages to auto-dismiss after a few seconds, so that they don't clutter the screen.
7. As a frontend developer, I want a single, documented error shape to parse, so that every component handles errors the same way.
8. As a frontend developer, I want field errors as an array of `{ field, message }` pairs, so that I can iterate and render them under the right input.
9. As a frontend developer, I want the error code to distinguish "not found" from "invalid input" from "server error", so that I can render the right UI (404 page vs inline banner vs toast).
10. As a frontend developer, I want success to be implicit in resolution, so that I don't need to check a `success: true` flag or parse a message string.
11. As a developer, I want the error contract to be testable through the `createCaller` seam, so that I can verify the exact wire shape without HTTP.
12. As a developer, I want the contract documented once, so that the frontend never reverse-engineers error shapes.

## Implementation Decisions

- **Field error structure**: array of `{ field: string, message: string }` pairs in `data.fieldErrors`. Example: `data.fieldErrors: [{ field: "title", message: "Title is required" }, { field: "description", message: "Description must be at most 2000 characters" }]`. Chosen over a flat map to support multiple errors per field if the validator ever needs it; the UI iterates the array and groups by `field`.
- **Validation aggregation**: the domain validator checks **all fields** and collects every failure before throwing. The user fixes everything in one pass, not one field at a time.
- **Success feedback contract**: success is implicit in resolution. `create` and `update` return the stored `Task`; `delete` returns `void`. The procedure resolving without throwing is the success signal. The UI uses React Query's `isSuccess`/`isPending` flags and the returned data. No `{ success: true }` envelope, no success message field — the backend stays lean and the UI owns presentation.
- **Error taxonomy on the wire** (from Spec 01, carried through Specs 03–04):
  - `NOT_FOUND` — `{ code: "NOT_FOUND", message: "Task not found: <id>", data: {} }`. The id is embedded in the message for debugging; `data.fieldErrors` is absent.
  - `BAD_REQUEST` — `{ code: "BAD_REQUEST", message: "Validation failed", data: { fieldErrors: [{ field, message }] } }`. Field-level errors in `data.fieldErrors`.
  - Other errors (network, 500, timeout) — standard tRPC/HTTP error shape; `code` and `message` from the transport; no `fieldErrors`.
- **Malformed vs nonexistent id**: malformed id → `BAD_REQUEST` with `data.fieldErrors: [{ field: "id", message: "Invalid UUID format" }]`. Well-formed but nonexistent id → `NOT_FOUND` with the id in the message. Two distinct failure modes, deliberately different.
- **Network/infrastructure errors**: after React Query's retry exhaustion (3x, exponential backoff from Spec 03), the mutation/query's `error` state holds the error. The backend provides no special contract — standard tRPC/HTTP error shape. The UI shows an inline banner or toast with a retry action.
- **Error display pattern** (confirmed by the frontend spec `01-task-ui.md`):
  - **Validation errors** (`BAD_REQUEST` with `fieldErrors`): inline field-level error text under the offending input.
  - **Operation-level failures** (`NOT_FOUND`, network/server errors): a single status banner above the form or list, with the error message.
  - **Transient messages**: auto-dismiss after ~3 seconds (and on the next action).
  - **List page deletion**: inline two-step confirm ("Delete?" → [Delete][Cancel]); on success the list refetches and shows a transient success message; on failure it shows the error reason.
- **Strict contracts**: the error shape is strictly typed on both sides. No `any`. The frontend parses `error.data.fieldErrors` as `Array<{ field: string; message: string }>`; if absent, falls back to `error.message`.
- **Decoupled layering**: the error contract is defined by the `shared/` module (domain errors) and the `server/` layer (tRPC error mapping + custom errorFormatter). The frontend (`app/`) consumes the contract. `shared/` stays framework-free.

## Testing Decisions

- A good test exercises external behavior through the public seam — never internals, never mocks of internal collaborators.
- **Seam**: the `createCaller` (server-side caller from Spec 03). Tests verify the exact wire shape: `NOT_FOUND` errors include the id in the message and have no `fieldErrors`; `BAD_REQUEST` errors from validation carry `data.fieldErrors` as an array of `{ field, message }`; all field errors are present when multiple fields are invalid; success resolves with the `Task` (or void for delete).
- **Table-driven cases**: for each procedure, assert the error shape for: valid input (success, no error), malformed id (BAD_REQUEST with `fieldErrors: [{ field: "id", message: "..." }]`), nonexistent id (NOT_FOUND with id in message), invalid field (BAD_REQUEST with the specific field error), multiple invalid fields (all errors in the array).
- **Prior art**: the procedures spec (item 4) established the `createCaller` seam and inline error mapping; the repository spec (item 2) established the in-memory adapter as the test double. Error contract tests follow both patterns.
- **TDD**: per the coding standards, built in vertical red-green slices — error shape assertions first (verify `fieldErrors` array structure), then the multi-error case, then the NOT_FOUND message format.

## Out of Scope

- Client-side error display implementation (frontend items — the UI owns presentation).
- Toast/banner component design (frontend item).
- Retry logic configuration (already set in Spec 03: 3x, exponential backoff).
- Optimistic update rollback on error (frontend item).
- Internationalization of error messages (deferred).

## Further Notes

- Depends on Specs 01–05: the error taxonomy (Spec 01); the repository's `TaskNotFound` (Spec 02); the custom errorFormatter (Spec 03); the inline error mapping (Spec 04); the SSR error handling patterns (Spec 05).
- The frontend spec (`specs/frontend/01-task-ui.md`) originally assumed "a field-error map" — this spec overrides that to an array of `{ field, message }` pairs, which supports multiple errors per submission and is easier to iterate in the UI.
- The original PT-BR requirements are preserved under `specs/source/`. The PT-BR frontend spec ("Exiba mensagens apropriadas em caso de erro durante as operações") is satisfied by this contract: the backend provides structured errors, the UI renders them inline (validation) or as banners (operation-level).
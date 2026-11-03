# Spec: Task Procedures

Status: ready-for-agent
Scope: Backend item 4 — the five tRPC task procedures (list, get, create, update, delete) with validation, error mapping, and the malformed-vs-nonexistent distinction.
Depends on: Spec 01 (Task domain — entity, input contracts, error taxonomy, validation rules); Spec 02 (Repository — TaskRepository interface); Spec 03 (tRPC infrastructure — context, error formatting, client factory).
Sources: Grilling session (item 4, rounds 1); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Artefact's task domain and repository are defined, but nothing wires them to the network. The frontend has no typesafe way to list, fetch, create, edit, or delete tasks, and there is no single place where domain errors become wire errors. Without procedures, the app cannot perform any task operation end-to-end, and without a consistent error-mapping strategy, the UI cannot tell a missing task from a malformed id or an invalid field.

## Solution

A single tRPC task router with five thin procedures — `list`, `get`, `create`, `update`, `delete`. Each procedure validates its input through the shared domain parsers, delegates to the `TaskRepository` via context, and maps domain errors to tRPC codes inline. Procedures contain no business logic: they are the wire boundary, not the logic layer. The repository stamps fields; the domain owns rules; procedures translate.

## User Stories

1. As an app user, I want to fetch one ordered page for a task status in one call, so that each Kanban lane can load independently.
2. As an app user, I want to fetch a single task by id, so that a detail or edit page can load one record.
3. As an app user, I want to create a task with a title (and optional description), so that I can add new work to my list.
4. As an app user, I want to update a task's title, description, and status together, so that a single submission replaces the whole editable state.
5. As an app user, I want to delete a task, so that completed or unwanted tasks are removed.
6. As an app user, I want a clear "not found" error when I try to edit or delete a task that no longer exists, so that I'm never fooled into thinking a change saved.
7. As an app user, I want a clear "invalid input" error when I send a malformed id, so that programming bugs surface as what they are rather than as confusing "not found" errors.
8. As an app user, I want field-level errors when my input is invalid (e.g. empty title, unknown field), so that I know exactly what to fix.
9. As a frontend developer, I want each procedure's input and output fully typed, so that I get compile-time safety and autocomplete without code generation.
10. As a frontend developer, I want mutations to return the stored task, so that I can update the cache and show feedback without re-fetching.
11. As a frontend developer, I want delete to signal success without a payload, so that I can simply remove the task from the list.
12. As a developer, I want procedures to be thin and readable, so that the wire boundary is obvious and each procedure is trivially testable.
13. As a developer, I want the error-mapping logic to be explicit and inline, so that any reviewer can see exactly how a domain error becomes a wire error.
14. As a developer, I want procedures to depend on the repository interface, not the concrete adapter, so that tests use the real in-memory adapter without mocking.

## Implementation Decisions

- **Procedure thickness**: thin wrappers — validate input via `.input()`, call the repository, map errors. No business logic in procedures. The domain module owns rules; the repository owns persistence and stamping; procedures are the wire boundary.
- **Error mapping**: inline `try/catch` per procedure. `TaskNotFound → TRPCError({ code: "NOT_FOUND", message: "Task not found: <id>" })`; `ValidationFailed → TRPCError({ code: "BAD_REQUEST", message: "Validation failed", cause: <field errors> })`; `InvalidTaskCursor → BAD_REQUEST` per Backend Spec 07. The custom error formatter (Spec 03) copies `cause` field errors into `data.fieldErrors` so they reach the client.
- **File organization**: single router file with all five procedures — co-located, ~80 lines, trivially navigable. Re-split when a second entity arrives.
- **Input contracts** (from Spec 01):
  - `list`: `{ status, cursor? }` → returns `{ items, nextCursor }` (page size and cursor rules are defined by Backend Spec 07; this supersedes the original no-input full-list contract)
  - `get`: `{ id: UUID }` → `Task` or `NOT_FOUND`
  - `create`: validated `{ title, description? }` → stored `Task`
  - `update` (PUT): validated `{ id, title, description | null, status }` → stored `Task`
  - `delete`: `{ id: UUID }` → `void`
- **Malformed vs nonexistent id**: a malformed id fails validation → `BAD_REQUEST` (field error `{ id: "Invalid UUID format" }`); a well-formed but nonexistent id fails lookup → `NOT_FOUND` with the id in the message. Two distinct failure modes, deliberately different.
- **Strict inputs**: unknown keys rejected (from Spec 01); the validator throws `ValidationFailed` which the procedure maps to `BAD_REQUEST`. The `tasks.list` input additionally recognizes only the optional `direction` metadata supplied by the existing tRPC infinite-query hook, as detailed in Backend Spec 07.
- **Decoupled layering**: procedures live in `server/` and import validators, entity types, and errors from `shared/task/`. The repository also lives in `server/`. `shared/` stays framework-free; `server/` is the wiring layer. Procedures depend on the `TaskRepository` interface type only.
- **No business logic in procedures**: create delegates id/timestamp stamping to the repository; update delegates `updatedAt` bumping to the repository; validation is the domain module's job via `.input()`.
- **Mutation return contract**: `create` and `update` return the stored `Task` so the client can update its cache and show feedback without re-fetching. `delete` returns `void` — the client's success signal is the procedure's OK response.
- **No additional procedures**: no `tasks.exists`, `tasks.count`, `tasks.toggleStatus`, or batch operations — out of scope for v1.

## Testing Decisions

- A good test exercises external behavior through the public seam — never internals, never mocks of internal collaborators.
- **Seam**: the `createCaller` (server-side caller from the tRPC router). Tests invoke procedures directly without HTTP, using the real in-memory adapter through the interface. Each procedure's happy path, validation failures (BAD_REQUEST with field errors), and not-found errors (NOT_FOUND) are verified.
- **Table-driven cases per procedure**:
  - `list`: returns at most 10 tasks for the requested status in the established order; page boundaries, cursor progression, terminal pages, and invalid cursors are covered by Backend Spec 07.
  - `get`: returns the task for a valid id; `NOT_FOUND` for a well-formed nonexistent id; `BAD_REQUEST` for a malformed id.
  - `create`: returns the stored task with stamped id/timestamps; `BAD_REQUEST` for empty title, whitespace-only title, unknown keys, oversized fields; description normalization (omitted → null, empty → null).
  - `update`: returns the updated task with bumped `updatedAt`; `NOT_FOUND` for nonexistent id; `BAD_REQUEST` for malformed id, invalid title, unknown keys; full-replace semantics (all editable fields required).
  - `delete`: success with no payload for existing task; `NOT_FOUND` for nonexistent id; `BAD_REQUEST` for malformed id.
- **Prior art**: the repository spec (item 2) established the in-memory adapter as the test double and the behavior-only assertion style; the Task domain spec (item 1) established pure-function table-driven tests. Procedure tests follow both patterns, exercised through the caller seam.
- **TDD**: per the coding standards, built in vertical red-green slices against the confirmed public seam — `get` happy path + not-found first, then `create`, then `update`, then `delete`, then `list` with ordering assertions.

## Out of Scope

- Client-side cache invalidation strategy (frontend item — React Query `invalidateQueries` after mutations).
- Pagination and status-based lane selection are defined by Backend Spec 07; search, other filters, or batch operations remain out of scope.
- `tasks.exists`, `tasks.count`, or any convenience procedure.
- Auth and per-user scoping (deferred).
- Rate limiting or request throttling.

## Further Notes

- Depends on Specs 01–03: the entity shape, input contracts, and error taxonomy (Spec 01); the repository interface and its test-double role (Spec 02); the tRPC context, error formatter, and client factory (Spec 03).
- The `createCaller` seam (from Spec 03) means procedure tests run in-process without HTTP — this is the highest seam possible for testing the full validate→repository→error-mapping pipeline.
- The original PT-BR requirements are preserved under `specs/source/`.
- Field names translate from the original PT-BR requirements as: `titulo` → `title`, `descricao` → `description`, `dataCriacao` → `createdAt`.
- `specs/backend/07-task-pagination.md` supersedes this spec's original `tasks.list` input/output and pagination exclusion.

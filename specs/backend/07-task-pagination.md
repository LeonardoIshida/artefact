# Spec: Task Pagination

Status: ready-for-agent
Scope: Backend — paginated repository contract and tRPC `tasks.list` procedure for status-specific task pages.
Depends on: Backend Spec 01 (Task domain — entity, status, and errors); Backend Spec 02 (Repository — `TaskRepository`); Backend Spec 03 (tRPC infrastructure); Backend Spec 04 (Task procedures).
Sources: User-provided PT-BR grading feedback (“Infinite Scroll: Na página de listagem, implemente uma funcionalidade de carregamento incremental das tarefas conforme o usuário rola a página.”); pagination grilling session (2026-11-02).

## Problem Statement

The current list procedure and repository return every task in one response. That makes the initial list response grow with the entire task collection and gives the frontend no way to request only the next tasks in a status lane. The exam requirement asks for incremental loading while the user scrolls, so the backend needs a bounded, ordered page contract that the Kanban can continue independently for each status.

## Solution

Replace the full-list `tasks.list()` contract with a status-specific cursor query. The repository returns at most 10 tasks per call and an opaque continuation cursor; the existing `tasks.list` procedure accepts `{ status, cursor? }` and returns `{ items, nextCursor }`. The existing task ordering remains authoritative. An omitted/null input cursor requests the first page; `nextCursor: null` means the lane is complete. The response does not include a total count.

## User Stories

1. As a user, I want to request a page for one task status, so each Kanban lane can load independently.
2. As a user, I want pages to retain the existing task order, so scrolling does not reorder tasks unexpectedly.
3. As a user, I want the initial response and each continuation response bounded to 10 tasks, so large lanes are not sent in full on the initial request.
4. As a developer, I want an opaque cursor that preserves the ordering tie-break, so repository ordering details do not become a client contract.
5. As a developer, I want invalid cursors to fail explicitly, so a bad continuation cannot silently restart and duplicate results.

## Implementation Decisions

- **Repository page contract**: replace `list(): Promise<Task[]>` with `listPage(input: { status: TaskStatus; cursor?: string | null }): Promise<TaskPage>`. Define `TaskPage` with the framework-free repository types in `shared/task/repository.ts`; it contains `items: Task[]` and `nextCursor: string | null`. The cursor is opaque to callers and passed through unchanged.
- **Fixed page size**: return 10 tasks when at least 10 matching tasks remain, otherwise return the remaining tasks. The size is a server-side constant, not a client input. Do not add an offset or arbitrary `limit` field.
- **Status filtering**: `status` is required and must be one of the domain's task statuses. Apply the status filter before pagination. A page contains tasks from only that status.
- **Ordering**: preserve the repository's existing order: `updatedAt` descending, with same-millisecond ties ordered by insertion sequence descending (later insertion first). A cursor resumes strictly after the last returned item in that order and preserves the exact tie position without exposing the sequence value as a public API field.
- **Continuation token**: an omitted or `null` cursor requests the first page. A non-null `nextCursor` is returned if and only if at least one more matching task exists after the current page. Return `null` at end-of-lane, including for an empty lane. A cursor is valid only for the status and ordering position for which it was issued.
- **Invalid cursor**: malformed, unusable, or wrong-status cursors fail with tRPC `BAD_REQUEST`; do not silently restart at the first page. Represent cursor failures as a repository-level `InvalidTaskCursor` error alongside the page contract in `shared/task/repository.ts` (it is not a third domain error) and map it at the procedure boundary. The frontend recovery behavior is defined in Frontend Spec 08.
- **Procedure contract**: evolve the existing `tasks.list` procedure; do not add a second list procedure. Its app-facing input is `{ status, cursor? }`; the optional cursor accepts a string or `null`, with both omitted and `null` meaning the first page. With the repo's existing classic tRPC infinite-query integration, tRPC may also supply its optional `direction` metadata (`forward` or `backward`); accept and validate that transport field if it reaches the procedure, but it is not a user-selected sort direction and is not passed to the repository. Reject all other unknown keys. The procedure delegates to `repository.listPage` and returns `{ items, nextCursor }`. The client cannot choose page size or request total counts.
- **Layering**: keep the repository interface framework-free. The procedure validates the status/cursor input and maps `InvalidTaskCursor` to `BAD_REQUEST`; it contains no ordering or slicing logic of its own.
- **SSR relationship**: the list page makes an independent first-page request for each of `todo`, `in_progress`, and `done`. The SSR and client-loading behavior is specified in Frontend Spec 08.

## Testing Decisions

- **Repository seam**: test through `TaskRepository` using the real in-memory adapter. Verify status filtering, the 10-item boundary, `updatedAt` ordering, same-millisecond insertion tie-breaking across page boundaries, cursor progression without duplicates, and `nextCursor: null` at the end and for an empty lane.
- **Procedure seam**: call `tasks.list` through the tRPC `createCaller` with the real repository. Verify required/valid status, omitted and null first-page cursors, the `{ items, nextCursor }` response, first and subsequent pages, strict rejection of unknown inputs, and `BAD_REQUEST` for malformed or wrong-status cursors.
- **Test style**: assert observable results through the public repository and caller interfaces. Do not mock the repository or assert on the cursor's encoded representation.

## Out of Scope

- Total task counts or a separate count procedure.
- Client-side slicing of a full SSR response.
- Offset pagination, client-selectable page sizes, search, or filters beyond status.
- Database-specific cursor implementation or snapshot isolation across concurrent writes.
- IntersectionObserver, loading indicators, retry UI, and mutation cache behavior; these belong to Frontend Spec 08.

## Further Notes

- This spec supersedes the full-list and pagination exclusions in `specs/backend/02-repository.md`, `specs/backend/04-procedures.md`, and the list-preload decision in `specs/backend/05-ssr-bridge.md`.
- The linked UI contract is `specs/frontend/08-task-infinite-scroll.md`. That spec owns per-lane SSR loading, scroll triggers, retry, and cache reset behavior.

# Spec: Repository — In-Memory Task Data Access

Status: ready-for-agent
Scope: Backend item 2 — the TaskRepository seam: interface, in-memory adapter, lifecycle, and seeding.
Depends on: Spec 01 (Task domain) — the repository implements the entity, input contracts, and error taxonomy defined there.
Sources: Grilling session (item 2, rounds 1–2); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Artefact's tasks need to be stored somewhere and read back reliably, but the choice of storage is deliberately undecided for now. If routes and UI talk to a concrete store directly, swapping storage later (in-memory → real database) means rewriting every call site — and tests can't run without a real database. The system needs a single, storage-agnostic seam where persistence lives, so that the rest of the app depends on a contract rather than on how tasks are stored, and so that the first concrete adapter can double as the test double.

## Solution

A `TaskRepository` interface defined by the Task domain, implemented by one in-memory adapter. Every layer above — tRPC procedures, SSR callers, UI — depends on the interface type only, never the concrete adapter. The adapter is instantiated in exactly one composition point, so a future database adapter swaps in one place. The interface is async from the start (Promise-returning) so the adapter swap changes no call sites, even though the in-memory adapter is synchronous internally.

## User Stories

1. As an app user, I want my tasks listed with the most recently touched first, so that active work is always at the top of the list.
2. As an app user, I want a task I just edited to jump to the top of the list, so that I can immediately see and verify my change.
3. As an app user, I want tasks created in the same moment to appear in a stable, predictable order, so that the list doesn't flicker between loads.
4. As an app user, I want creating a task to return the full saved task (with its generated id and timestamps), so that the UI can show it immediately without re-fetching.
5. As an app user, I want editing a task to return the full updated task, so that I can confirm exactly what was stored.
6. As an app user, I want deleting a task to succeed with a clear success signal (no payload needed), so that the UI can simply remove it from the list.
7. As an app user, I want an attempt to fetch, edit, or delete a task that no longer exists to fail loudly, so that I'm never shown stale data as if it were current.
8. As a developer/evaluator opening the app, I want to immediately see a populated task list (todo, in_progress, done), so that the app's features are visible without manual data entry.
9. As a developer, I want the storage behind a small interface, so that I can swap the in-memory adapter for a real database later without touching routes, procedures, or UI.
10. As a developer, I want the in-memory adapter to double as the test double, so that procedure and domain tests exercise real repository behavior without mocking libraries.
11. As a developer, I want the repository to be the sole owner of id and timestamp stamping, so that no other layer can forge or corrupt them.
12. As a developer, I want the repository to accept only validated input from the domain layer, so that storage stays a thin adapter and never re-validates.
13. As a developer, I want the repository interface to be async from the start, so that the database adapter drops in without changing any call sites.
14. As a developer, I want the adapter instantiated in exactly one place, so that swapping storage is a one-line change.
15. As a frontend developer, I want list updates after an edit to reflect the new order automatically (edited task floats to top), so that optimistic UI matches the server's stored order.
16. As a developer, I want a predictable, deterministic task state after a dev reload — the in-memory store resets to a known seeded state — so that demos and debugging start from a consistent baseline.

## Implementation Decisions

- **The `TaskRepository` interface** is the seam. Its contract:
  - `listPage(input: { status: TaskStatus; cursor?: string | null }): Promise<TaskPage>` — up to 10 tasks for one status, ordered by `updatedAt` descending; same-millisecond ties are broken by insertion order (later insertion first). An omitted/null cursor starts the lane; `nextCursor: null` means it is complete. This page contract supersedes the original full-list `list()` contract; see Backend Spec 07 for cursor invariants.
  - `get(id: UUID): Promise<Task>` — throws `TaskNotFound` when missing.
  - `create(input: CreateInput): Promise<Task>` — input is the domain-validated `{ title, description? }`; stamps `id` (`crypto.randomUUID()`), `createdAt` (now, ISO 8601), `updatedAt` (= `createdAt`); returns the stored `Task`.
  - `update(id, payload): Promise<Task>` — payload is the domain-validated PUT `{ title, description, status }`; throws `TaskNotFound` when missing; bumps `updatedAt`; returns the stored `Task`.
  - `delete(id): Promise<void>` — throws `TaskNotFound` when missing; returns nothing. The success signal is the procedure's OK response itself (specified with the procedures item).
- **Async from day one**: every method returns a Promise even though the in-memory adapter is synchronous. The async signature is the stability of the seam — the DB adapter later is async and drops in without changing any call site.
- **Ordering**: by `updatedAt` descending (never null — untouched tasks' `updatedAt` equals their `createdAt`, so the "if null, use createdAt" fallback never triggers). Tiebreak by insertion order; edits reshuffle by design.
- **Adapter**: in-memory, Map-backed (keyed by id), plain module-level singleton. Field stamping lives here, per the domain spec's ownership boundary.
- **Lifecycle (accepted trade-offs, documented)**: the singleton is stashed on `globalThis` so every bundle/request in a process shares one store (a plain module-level variable would be re-evaluated per bundle in dev and make IDs/timestamps from one request unknown to another). Dev hot-reloads still wipe and **re-seed** (deterministic demo state on every reload); in production it seeds once per process and deletions persist until restart. This is the known cost of in-memory storage; the DB adapter (deferred) fixes it.
- **Seed data**: on first boot, when the store is empty, seed 3 tasks — one `todo` without description, one `in_progress` with a description, one `done` with a description — with staggered timestamps so the ordering rule is visible immediately. They are ordinary, deletable tasks.
- **Dependency direction**: everything above the seam (procedures, SSR caller) depends on the `TaskRepository` interface type only, never the concrete adapter. The adapter is instantiated in exactly **one composition point**, so a future DB adapter swaps in one place.
- **Test double**: the in-memory adapter *is* the test double. Procedure and domain tests use it through the interface; no mocking library, no second fake.
- **Error taxonomy** (reused from the domain spec): `TaskNotFound → NOT_FOUND`; validation errors map to `BAD_REQUEST` at the procedure boundary. Malformed id is a validation failure; well-formed-but-missing id is a lookup failure. The repository-specific `InvalidTaskCursor → BAD_REQUEST` error is defined by Backend Spec 07 and does not change the domain error taxonomy.
- **Dates**: ISO 8601 strings end-to-end; no data transformer on the wire; the UI constructs `Date` only for display.
- **Ownership**: the repository stamps `id`, `createdAt`, `updatedAt` and nothing else. It accepts only already-validated input from the domain layer; it never re-validates, never normalizes. The domain module owns rules; the repository owns persistence.

## Testing Decisions

- A good test exercises external behavior only: it calls the repository's public interface and asserts on outputs and thrown errors — never on internals. No mocks are needed: the in-memory adapter is exercised directly through the interface.
- **Seam**: the `TaskRepository` interface itself. Tests: ordering by `updatedAt` (including the tiebreak and the edit-floats-to-top rule), stamping correctness (`id`/`createdAt`/`updatedAt` set at create; `updatedAt` bumped and `createdAt` unchanged on update), `TaskNotFound` on missing ids for `get`/`update`/`delete`, seed-on-empty initialization, and the seed content (three statuses, staggered timestamps). Pure behavior, no framework coupling.
- **Prior art**: the Task domain spec (item 1) establishes the pattern — pure-function, table-driven, behavior-only, no mocks. The repository tests follow the same discipline but exercise a stateful seam rather than pure functions.
- **TDD**: per the coding standards, built in vertical red-green slices against the confirmed public seam — ordering and stamping first, then `TaskNotFound`, then seeding.

## Out of Scope

- tRPC procedures, route handler, client provider, SSR prefetch (backend items 3–5).
- The real database adapter (deferred; the interface is what makes it a one-place swap).
- Pagination and status filtering for lane pages are defined by Backend Spec 07; search, arbitrary filtering, and queries beyond the three status lanes remain out of scope.
- Auth and per-user scoping.
- Client-side caching behavior.

## Further Notes

- Depends on Spec 01: the repository implements the entity shape, input contracts, and error taxonomy defined there; it stamps exactly the fields the domain declares and throws exactly the errors the domain defines.
- The "if null, use createdAt" fallback was considered and rejected: `updatedAt` is never null (equals `createdAt` at birth), so ordering by `updatedAt` alone is unambiguous.
- The plain module-level singleton (option A) was chosen deliberately over the `globalThis`-stash pattern; the re-seed-on-reload behavior is a feature for demos and a documented limitation for production, revisited with the DB adapter.
- Field names translate from the original PT-BR requirements as: `titulo` → `title`, `descricao` → `description`, `dataCriacao` → `createdAt`.
- The paginated list contract is defined by `specs/backend/07-task-pagination.md`; that spec supersedes this document's original `list()` contract and pagination exclusion.

# Spec: Task Domain

Status: ready-for-agent
Scope: Backend item 1 — the Task entity, its input contracts, validation, and error taxonomy.
Sources: Grilling session (rounds 1–3, 2026-11-02); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Artefact lets users manage tasks, but nothing yet defines what a task *is*: which fields it has, what makes a title valid, what happens to an empty description, how status works, or what error a user sees when something goes wrong. Without one precise definition, the frontend and backend will drift apart, junk data (blank titles, oversized text) can enter the system, and errors become inconsistent — users won't know why their task was rejected or whether their edit actually saved.

## Solution

A Task domain module that is the single source of truth for the task entity and its rules. It defines the canonical Task shape (`id`, `title`, `description`, `status`, `createdAt`, `updatedAt`), strict validation for create and update inputs with automatic normalization (trimming, empty-to-null), and a small error taxonomy with field-level messages. Every layer above it — storage, tRPC procedures, UI — consumes this contract instead of re-defining rules, so a task means exactly the same thing everywhere.

## User Stories

1. As an app user, I want every task to require a meaningful title, so that my task list stays readable and searchable.
2. As an app user, I want leading and trailing spaces stripped from my title, so that tasks look tidy without me being pedantic.
3. As an app user, I want a whitespace-only title rejected, so that blank tasks never clutter my list.
4. As an app user, I want the description to be optional, so that I can capture quick tasks without mandatory extra typing.
5. As an app user, I want to clear a description later by setting it to null, so that outdated details don't linger.
6. As an app user, I want description text capped at a generous limit, so that a task stays a task and not an essay.
7. As an app user, I want every new task to start as "todo", so that new work is clearly distinguishable from started or finished work.
8. As an app user, I want to change a task's status freely between todo, in_progress and done, so that I can correct mistakes and track reality.
9. As an app user, I want each task to get a unique id automatically, so that I can reference a task even after renaming it.
10. As an app user, I want to see when a task was created and when it was last changed, so that I can tell how current it is.
11. As an app user, I want updating a task to replace its entire editable state in one submission, so that what I see is always what I last sent.
12. As an app user, I want updating or deleting a task that no longer exists to fail with a clear "not found" error, so that I'm never fooled into thinking a change saved.
13. As an app user, I want a malformed id rejected as invalid input rather than "not found", so that programming bugs surface as what they are.
14. As an app user, I want field-level error messages when my input is invalid, so that I know exactly what to fix.
15. As a frontend developer, I want one canonical Task type with ISO date strings, so that rendering timestamps needs no conversion guesswork.
16. As a frontend developer, I want the same validation rules the backend enforces, so that my client-side feedback never contradicts the server.
17. As a frontend developer, I want machine-readable validation errors keyed by field, so that forms can highlight the exact offending input.
18. As a frontend developer, I want unknown fields in a payload rejected, so that typos surface as errors instead of being silently swallowed.
19. As a frontend developer, I want ids and timestamps owned by the server, so that clients cannot forge or corrupt them.
20. As a developer, I want validation as pure functions with no framework coupling, so that they are trivially testable and reusable anywhere.

## Implementation Decisions

- **Entity**: `Task` has seven fields — `id`, `title`, `description`, `status`, `tags`, `createdAt`, `updatedAt`. The `tags` field is defined by Frontend Spec 10; nothing else in v1.
- **id**: UUID string, generated server-side with `crypto.randomUUID()`. Never accepted from client input; every id-bearing input validates UUID shape. The id is the task's permanent identity and can never be reassigned.
- **title**: string. Trimmed before validation; at least 1 character after trimming (whitespace-only is rejected); at most 200 characters. No uniqueness constraint.
- **description**: `string | null`. `null` means "no description". Input may omit it or send any string; empty or whitespace-only input normalizes to `null`. At most 2000 characters.
- **status**: enum of `todo`, `in_progress`, `done`. Defaults to `todo` at creation; not settable at creation; any transition between values is allowed (no state machine).
- **createdAt / updatedAt**: ISO 8601 date strings. `createdAt` is stamped once at creation and is immutable. `updatedAt` equals `createdAt` at birth and is bumped on every successful update. Neither is ever accepted from client input.
- **Create contract**: `{ title: string, description?: string }`. Omitted description means none. Sending any other field (including `id`) is an error.
- **Update contract (PUT — full replace)**: `{ id: UUID, title: string, description: string | null, status: TaskStatus }`. The `id` acts as the selector — the address of the task — and never changes identity. All editable fields must be present in every update; there is no "omitted" description (send `null` to clear).
- **Validation is hand-rolled; no validation library** (deliberate — this project is a coding exam and error handling is a demonstrated skill). Validators are pure functions — a create-input parser and an update-input parser — exported from the domain module. Each either returns the parsed, normalized input or throws a `ValidationError` carrying field-level errors (e.g. `{ title: "Title is required" }`).
- **Strict inputs**: payloads with unknown keys are rejected.
- **Error taxonomy**: exactly two domain errors — `ValidationFailed` (field-level errors; maps to `BAD_REQUEST`) and `TaskNotFound` (maps to `NOT_FOUND`). A malformed id is a validation failure; a well-formed id that matches no task is a lookup failure.
- **Serialization**: dates are ISO 8601 strings end-to-end — no data transformer on the wire; the UI constructs `Date` objects only for display.
- **Stack**: tRPC (mandated by the exam), React Query, and Tailwind stay; zod is explicitly not used.
- **Ownership boundaries**: the domain module owns rules only. Stamping ids and timestamps is the repository's job (item 2 spec); mapping domain errors to tRPC codes is the procedures' job (item 4 spec). The domain declares both contracts here.

## Testing Decisions

- A good test exercises external behavior only: it calls the module's public interface and asserts on outputs and thrown errors — never on internals. No mocks are needed anywhere in this spec: the validators are pure functions.
- **Primary seam**: the create/update input parsers as pure functions. Table-driven tests covering: title trimming; minimum length (whitespace-only rejected); maximum lengths (200 / 2000); description normalization (omitted → null, empty → null, whitespace-only → null, real text preserved); strict unknown-key rejection; UUID shape validation; the field-level error payload shape; every valid status value; update payloads requiring all editable fields.
- **Deferred seam** (belongs to the procedures spec): the tRPC caller boundary, where malformed id → `BAD_REQUEST` and nonexistent id → `NOT_FOUND` are asserted end-to-end without HTTP.
- **Prior art**: none — this is the codebase's first module; these tests become the pattern that later specs follow.

## Out of Scope

- Storage and persistence: the repository interface and its in-memory adapter (backend item 2).
- tRPC procedures, route handler, client provider, SSR prefetch (backend items 3–5).
- Client-side form validation mirroring these rules (frontend items).
- Any entity fields beyond the six defined here plus the `tags` field defined by Frontend Spec 10; domain-level status filtering/grouping rules; auth; a real database. Query-time filtering by the existing status enum is defined in Backend Spec 07 and does not change the domain contract.

## Further Notes

- Field names translate from the original PT-BR requirements as: `titulo` → `title`, `descricao` → `description`, `dataCriacao` → `createdAt`.
- Decisions marked as deliberate overrides during grilling: ISO strings over `Date` objects; PUT (full replace) over PATCH; including `status` and `updatedAt` beyond the original "at least" fields; hand-rolled validation over zod.

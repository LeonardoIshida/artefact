# Spec: Task Feedback & Error Handling

Status: ready-for-agent
Scope: Frontend — shared feedback, loading, and error-handling primitives for task operations.
Depends on: Spec 01 (Task domain — error taxonomy: `ValidationFailed`, `TaskNotFound`); Spec 03 (tRPC infrastructure — client provider, SSR caller); Spec 04 (Task procedures — error mapping to tRPC codes).
Sources: Grilling session (rounds 1–2, 2026-11-02); split from former Spec 04 (Task UI); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Task operations can fail or take time, and today the frontend has no consistent way to surface outcomes: there is no shared banner, no transient success/error message, no loading state, and no handling of not-found or validation failures. Without one definition, each page will invent its own feedback, errors will be swallowed or shown inconsistently, and users will not know whether an action succeeded, failed, or is still in progress.

## Solution

A small set of shared feedback primitives that every task page reuses: a status banner for mutation outcomes (success/server error), a transient message that auto-dismisses, inline field-level error text, loading states on submit/delete controls, and a not-found redirect. tRPC errors are mapped once into these primitives, so validation failures surface as field errors and `TaskNotFound` surfaces as a redirect. These primitives are the single source of truth for feedback across the task UI.

## User Stories

1. As an app user, I want a clear success or error message after an operation, so I know what happened.
2. As an app user, I want feedback to disappear on its own after a few seconds, so the screen stays clean.
3. As an app user, I want loading states while saving or deleting, so I know something is happening.
4. As an app user, I want field-level error messages under inputs, so I know exactly what to fix.
5. As an app user, I want a redirect when a task I am editing no longer exists, so I am not left on a broken page.
6. As an app user, I want error messages when an operation fails (backend or frontend), so I understand failures.
7. As an app user, I want transient feedback after deleting, so I know the deletion succeeded or failed.
8. As a frontend developer, I want one shared set of feedback primitives, so pages do not reinvent them.
9. As a frontend developer, I want tRPC errors mapped once into field errors or banners, so pages stay simple.
10. As a developer, I want feedback behavior covered by tests, so regressions are caught.

## Implementation Decisions

- **Primitives**: A status banner (success/error) rendered above a form or list; a transient message (auto-dismiss after ~3 seconds and on the next user action); inline field-error text under inputs; and loading state on submit/delete controls (disabled + spinner).
- **tRPC error mapping**: A single helper maps a tRPC error to either a field-error map (for `BAD_REQUEST` wrapping `ValidationFailed`) or a banner message (for other failures). The exact carrier (code/data/cause) is defined by Spec 04; this spec consumes it.
- **Not-found handling**: When a task id is malformed or the task does not exist, redirect to `/tasks` (no inline not-found page).
- **Transient message lifetime**: Auto-dismiss after ~3 seconds; also dismiss on the next user action. No manual dismiss button.
- **Deletion feedback**: On the list, deletion shows the transient message on success (success text) or failure (error reason); the list refetches after a successful delete.
- **Component location**: These primitives are shared/reusable, so they live in the top-level `components/` folder (per project Next.js instructions), not under the task route.
- **No toast library**: None is installed; feedback is inline only.
- **Timestamps display**: Out of scope here (belongs to the list spec).

## Testing Decisions

- A good test exercises external behavior only: render the primitives through Testing Library and assert on visible text, disabled state, and auto-dismiss timing — never on internals.
- **Modules tested**: The feedback primitives (banner, transient message, loading control) and the tRPC-error mapping helper.
- **Prior art**: `shared/task/task.test.ts` for pure-helper tests; component tests follow Testing Library conventions.
- **Deferred**: The wire format of tRPC errors is defined by Spec 04; mapping tests assume that contract.

## Out of Scope

- The list page itself and its SSR preload (Spec 02).
- The create/update form and its validation (Spec 03).
- Backend storage, procedures, and error taxonomy (Specs 01–04).
- Auth, real-time updates, and E2E tests.

## Further Notes

- This spec is foundational: Specs 02 (Task List) and 03 (Task Form) depend on these primitives.
- Feedback is inline only (no toast library installed).

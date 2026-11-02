# Spec: Task Create/Update Form

Status: ready-for-agent
Scope: Frontend — create and edit pages sharing one validated task form.
Depends on: Spec 01 (Task domain); Spec 03 (tRPC infrastructure); Spec 04 (Task procedures — `task.create`, `task.update`); Spec 01 frontend (Task Feedback & Error Handling — banner, field errors, loading).
Sources: Grilling session (rounds 1–2, 2026-11-02); split from former Spec 04 (Task UI); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Users cannot create or edit tasks from the browser: there is no form, no client-side validation, and no handling of submission outcomes. Without a shared, validated form, create and edit will diverge, validation will drift from the backend rules (required title, length caps, status enum), and feedback will be inconsistent. Editing also needs to handle tasks that no longer exist.

## Solution

A single shared `TaskForm` component used by both `/tasks/new` (create) and `/tasks/[id]/edit` (edit), driven by a `mode: "create" | "edit"` prop and an optional `initialTask` that seeds values and switches submission to `task.update`. Validation reuses the shared parsers, with immediate controlled input values and debounced validation. Status is editable only in edit mode. On success, redirect to `/tasks`; on failure, show field errors or a banner. A missing/invalid task redirects to `/tasks`.

## User Stories

1. As an app user, I want to create a new task via a form, so I can capture work.
2. As an app user, I want the form to prevent submission when the title is empty, so blank tasks never enter the system.
3. As an app user, I want leading and trailing spaces stripped from my title automatically, so tasks look tidy.
4. As an app user, I want client-side validation that matches the backend, so I get instant feedback without a round trip.
5. As an app user, I want field-level error messages, so I know exactly what to fix.
6. As an app user, I want validation to not fire on every keystroke (debounced), so typing stays smooth.
7. As an app user, I want to edit an existing task (title, description, status), so I can keep details current.
8. As an app user, I want the edit form pre-filled with current values, so I do not retype everything.
9. As an app user, I want to change status freely between todo, in_progress, and done, so I can track reality.
10. As an app user, I want to be redirected to the list after saving, so I see the updated list.
11. As an app user, I want a redirect when a task I am editing no longer exists, so I am not left on a broken page.
12. As an app user, I want loading states while saving, so I know something is happening.
13. As an app user, I want error messages when an operation fails (backend or frontend), so I understand failures.
14. As a frontend developer, I want one shared form for create and edit, so logic is not duplicated.
15. As a frontend developer, I want to reuse the shared parsers for validation, so rules stay in sync with the backend.
16. As a developer, I want form behavior covered by tests.

## Implementation Decisions

- **Routes**: Create at `/tasks/new`, edit at `/tasks/[id]/edit`. Edit page redirects to `/tasks` if the id is malformed or the task does not exist.
- **Shared form**: `TaskForm` is used by both pages via `mode: "create" | "edit"` and an optional `initialTask?: Task` that seeds title/description/status and switches submission to `task.update` (with `id`). In create mode, status is not editable (new tasks start as `todo`).
- **Form state**: A single `useState` form-state object (title, description, status) with controlled inputs. Input values update immediately; validation is debounced (~300ms) so parsers do not run on every keystroke; validation always runs immediately on submit and on blur.
- **Client validation**: Reuse `parseCreateTaskInput` / `parseUpdateTaskInput` from the shared task module; map `fieldErrors` to inputs. The server re-validates.
- **Status labels**: The status `<select>` (edit mode only) displays "To do", "In progress", "Done" while keeping enum values `todo` / `in_progress` / `done` on the wire.
- **Feedback**: Inline field errors under inputs plus a single status banner above the form for mutation outcomes, using the shared primitives from Spec 01 (frontend). Loading state (disabled + spinner) on submit.
- **Post-save navigation**: After successful create or update, redirect to `/tasks`.
- **Component organization**: `TaskForm` lives under the task route as a private component (`app/tasks/_components/`), per project Next.js instructions.
- **Backend dependency**: `task.create` (mutation, `CreateTaskInput` → `Task`) and `task.update` (mutation, `UpdateTaskInput` → `Task`), defined by Spec 04. Edit page data source (get vs. filter list) is deferred to Spec 04.

## Testing Decisions

- A good test exercises external behavior only: render `TaskForm` through Testing Library and assert on visible errors, submit gating, and redirect/navigation outcomes — never on internals.
- **Modules tested**: `TaskForm` (rendering + validation + submission) and the `task.create` / `task.update` caller boundary.
- **Prior art**: `shared/task/task.test.ts` for pure parsers; component tests follow Testing Library conventions.
- **Debounced validation** is asserted by waiting for the debounced window before checking field errors.

## Out of Scope

- The list page and deletion (Spec 02 frontend).
- Feedback primitives themselves (Spec 01 frontend) — consumed here, not defined here.
- Backend storage and procedure implementation (Specs 01–04 backend).
- Auth, E2E tests, and accessibility beyond semantic HTML.

## Further Notes

- This spec depends on Spec 01 (frontend) for feedback primitives; implement that first.
- Form validation rules are identical to the backend's, via the shared parsers.
- Edit page data source and tRPC error wire format are deferred to Spec 04 (backend procedures).

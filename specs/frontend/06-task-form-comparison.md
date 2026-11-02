# Spec: Task Form — Comparison Layout

Status: ready-for-agent
Scope: Frontend — create and edit pages with a side-by-side comparison layout: current values (read-only, left) vs. new values (editable, right), with Cancel reset and save behavior. Supersedes visual and interaction decisions in `specs/frontend/03-task-form.md`.
Depends on: Spec 01 (Task domain — entity, validation, error taxonomy); Spec 03 (tRPC infrastructure — client provider, SSR caller); Spec 04 (Task procedures — `task.create`, `task.update`); Spec 04 frontend (UI foundation — shadcn components, AppHeader, feedback primitives); Spec 06 backend (Error contract — fieldErrors as array of { field, message }).
Sources: UI redesign grilling session (rounds 1–3, 2026-11-02); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

The current task form is a basic single-column layout with no visual distinction between existing and new values. When editing, users must mentally compare the current value with what they're typing. Without a side-by-side comparison, it's hard to see what's changing, and the form feels like a scaffold rather than a usable editing experience. The create form is unnecessarily complex (it shares the same layout as edit), and there's no clear "reset" behavior for Cancel.

## Solution

A simple create form (single column, all fields editable) and a comparison edit form (two columns: current values read-only on the left, editable new values on the right, with arrows between them). Cancel resets the draft without navigating. Successful saves return to the board with brief feedback. Status is editable only in edit mode. The form reuses the shared parsers for validation and maps the backend's `fieldErrors` array to the corresponding inputs.

## User Stories

1. As an app user, I want to create a new task via a simple single-column form, so I can capture work quickly.
2. As an app user, I want the form to prevent submission when the title is empty, so blank tasks never enter the system.
3. As an app user, I want leading and trailing spaces stripped from my title automatically, so tasks look tidy.
4. As an app user, I want client-side validation that matches the backend, so I get instant feedback without a round trip.
5. As an app user, I want field-level error messages, so I know exactly what to fix.
6. As an app user, I want validation to not fire on every keystroke (debounced), so typing stays smooth.
7. As an app user, I want to edit an existing task and see its current values alongside my new inputs, so I can compare before saving.
8. As an app user, I want the edit form pre-filled with current values in the "new" column, so I only change what I need.
9. As an app user, I want to change status freely between todo, in_progress, and done, so I can track reality.
10. As an app user, I want to be redirected to the board after saving, with brief success feedback, so I see the updated list.
11. As an app user, I want a redirect when a task I am editing no longer exists, so I am not left on a broken page.
12. As an app user, I want loading states while saving, so I know something is happening.
13. As an app user, I want error messages when an operation fails, so I understand failures.
14. As an app user, I want Cancel to reset my draft and stay on the form, so I can start over without losing my place.
15. As a frontend developer, I want one shared form for create and edit, so logic is not duplicated.
16. As a frontend developer, I want to reuse the shared parsers for validation, so rules stay in sync with the backend.
17. As a developer, I want form behavior covered by tests.

## Implementation Decisions

- **Routes**: Create at `/tasks/new`, edit at `/tasks/[id]/edit`. Edit page redirects to `/tasks` if the id is malformed or the task does not exist.
- **Shared form**: `TaskForm` is used by both pages via `mode: "create" | "edit"` and an optional `initialTask?: Task` that seeds values and switches submission to `task.update` (with `id`). In create mode, status is not editable (new tasks start as `todo`).
- **Create layout**: Single column — title (required), description (optional), with a "Create task" submit button and a "Cancel" button. No comparison columns.
- **Edit layout (comparison)**: Two columns per field — "Current" (read-only snapshot of the task's existing values) on the left, "New" (editable inputs, prefilled with current values) on the right, with a visual arrow (→) between them. Fields: title, description, status. On mobile, each field's current value stacks above its editable input.
- **Changed indicator**: When a "New" field value differs from its "Current" counterpart, apply a subtle visual indicator (e.g., border color change or small badge) so the user can see what will change.
- **Form state**: A single `useState` form-state object (title, description, status) with controlled inputs. Input values update immediately; validation is debounced (~300ms) so parsers do not run on every keystroke; validation always runs immediately on submit and on blur.
- **Client validation**: Reuse `parseCreateTaskInput` / `parseUpdateTaskInput` from the shared task module. Map the backend's `fieldErrors` array (from Spec 06) to inputs — group all messages by `field` and render them under the corresponding input. The server re-validates.
- **Status labels**: The status `<select>` (edit mode only) displays "To do", "In progress", "Done" while keeping enum values `todo` / `in_progress` / `done` on the wire.
- **Feedback**: Inline field errors under inputs plus a single status banner above the form for mutation outcomes, using shadcn `Alert` (success/error variants). Loading state (disabled + spinner) on submit. Transient messages auto-dismiss after ~3 seconds.
- **Cancel behavior**: Resets the form to its initial state — blank for create mode, original task values for edit mode. Stays on the form (no navigation, no confirmation prompt).
- **Post-save navigation**: After successful create or update, redirect to `/tasks` with a brief success message (transient, auto-dismissing).
- **Component organization**: `TaskForm` lives under the task route as a private component (`app/tasks/_components/`), per project Next.js instructions.
- **Backend dependency**: `task.create` (mutation, `CreateTaskInput` → `Task`) and `task.update` (mutation, `UpdateTaskInput` → `Task`), defined by Spec 04. Edit page data source (get vs. filter list) is deferred to Spec 04.

## Testing Decisions

- A good test exercises external behavior only: render `TaskForm` through Testing Library and assert on visible errors, submit gating, redirect/navigation outcomes, and Cancel reset — never on internals.
- **Modules tested**: `TaskForm` (rendering + validation + submission + Cancel reset + comparison layout), and the `task.create` / `task.update` caller boundary.
- **Prior art**: `shared/task/task.test.ts` for pure parsers; component tests follow Testing Library conventions (query by role/text, assert user-visible outcomes).
- **Debounced validation** is asserted by waiting for the debounced window before checking field errors.
- **Comparison layout**: tests verify that current values are rendered as read-only, new inputs are prefilled with current values, and the changed indicator appears when values differ.
- **Cancel reset**: tests verify that clicking Cancel clears the draft (blank for create, original values for edit) without navigating away.

## Out of Scope

- The list page and deletion (Spec 05 frontend).
- Feedback primitives themselves (Spec 04 frontend) — consumed here, not defined here.
- Backend storage and procedure implementation (Specs 01–04 backend).
- Auth, E2E tests, and accessibility beyond semantic HTML.
- Drag-and-drop (deferred).

## Further Notes

- This spec depends on Spec 04 (frontend) for feedback primitives; implement that first.
- Form validation rules are identical to the backend's, via the shared parsers.
- The error contract (Spec 06 backend) sends field errors as an array of `{ field, message }`; the form groups them by field and renders all messages under the corresponding input.
- The original PT-BR requirements are preserved under `specs/source/`.
- Edit page data source and the full tRPC error wire format are resolved by Specs 04 (backend procedures) and 06 (backend error contract).
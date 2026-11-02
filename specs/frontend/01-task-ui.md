# Spec: Task UI

Status: ready-for-agent
Scope: Frontend — task list page, create/update form, and feedback/error handling.
Depends on: Spec 01 (Task domain — entity, validation, error taxonomy); Spec 02 (Repository — TaskRepository interface); Spec 03 (tRPC infrastructure — server init, route handler, client provider, SSR client factory).
Sources: Grilling session (rounds 1–2, 2026-11-02); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Artefact's frontend is still the Next.js scaffold: there is no way to view, create, edit, or delete tasks in the browser, no loading or success/error feedback, and no handling of not-found or validation failures. Users cannot manage tasks from the UI, and any ad-hoc implementation risks drifting from the backend's rules (required title, length caps, status enum), producing inconsistent validation and confusing feedback. Without one precise definition, the list, form, and error handling will be built inconsistently and tests will be an afterthought.

## Solution

A task management UI built on the App Router that reuses the shared task domain as the single source of truth. It provides an SSR task list page, create and edit pages sharing one validated form, inline deletion on the list, and consistent loading/success/error feedback. Client validation reuses the shared parsers, so frontend feedback never contradicts the backend. Scaffolding (routes + test infra) lands first as its own PR, then vertical slices (list, create, edit, delete), each shipping its tests. Rendering tests use Testing Library + jsdom, added in the scaffolding PR.

## User Stories

1. As an app user, I want to see my tasks on a page that loads quickly via SSR, so I am not waiting for client fetching.
2. As an app user, I want to see each task's title, description, status, and timestamps, so I understand my work at a glance.
3. As an app user, I want an empty state with a prompt to create a task, so a blank page is not confusing.
4. As an app user, I want to delete a task directly from the list with a trash-can icon, so I can clean up quickly.
5. As an app user, I want a confirmation before deletion, so I do not delete by accident.
6. As an app user, I want feedback after deleting (success or error), so I know what happened.
7. As an app user, I want to create a new task via a form, so I can capture work.
8. As an app user, I want the form to prevent submission when the title is empty, so blank tasks never enter the system.
9. As an app user, I want leading and trailing spaces stripped from my title automatically, so tasks look tidy.
10. As an app user, I want client-side validation that matches the backend, so I get instant feedback without a round trip.
11. As an app user, I want field-level error messages, so I know exactly what to fix.
12. As an app user, I want validation to not fire on every keystroke (debounced), so typing stays smooth.
13. As an app user, I want to edit an existing task (title, description, status), so I can keep details current.
14. As an app user, I want the edit form pre-filled with current values, so I do not retype everything.
15. As an app user, I want to change status freely between todo, in_progress, and done, so I can track reality.
16. As an app user, I want to be redirected to the list after saving, so I see the updated list.
17. As an app user, I want a clear redirect when a task I am editing no longer exists, so I am not left on a broken page.
18. As an app user, I want loading states while saving or deleting, so I know something is happening.
19. As an app user, I want error messages when an operation fails (backend or frontend), so I understand failures.
20. As an app user, I want timestamps shown in my local time, so they are readable.
21. As an app user, I want status shown as readable labels (To do, In progress, Done).
22. As a frontend developer, I want one shared form for create and edit, so logic is not duplicated.
23. As a frontend developer, I want to reuse the shared parsers for validation, so rules stay in sync with the backend.
24. As a frontend developer, I want route-specific components co-located under the task route, per project conventions.
25. As a frontend developer, I want component and procedure tests shipping with each slice, so regressions are caught.
26. As a frontend developer, I want component rendering tests via Testing Library + jsdom, so UI behavior is verified.
27. As a developer, I want a scaffolding PR establishing routes and test infra before feature work, so slices stay focused.

## Implementation Decisions

- **Routes**: The task UI lives under `/tasks`: list at `/tasks`, create at `/tasks/new`, edit at `/tasks/[id]/edit`. The root `/` redirects to `/tasks`. There is no separate delete route — deletion happens inline on the list.
- **SSR preload**: The list page is an async Server Component that fetches `task.list` via the tRPC server caller (createCallerFactory) and renders the list; a client island handles delete and refetch. An empty list renders "No tasks yet." with a link to `/tasks/new`.
- **Backend dependency**: The frontend depends on four tRPC procedures — `task.list` (query → `Task[]`), `task.create` (mutation, `CreateTaskInput` → `Task`), `task.update` (mutation, `UpdateTaskInput` → `Task`), `task.delete` (mutation, `{ id }` → `Task`). These are defined by the backend procedures spec; this frontend spec declares the dependency only. Errors surface as tRPC errors wrapping `ValidationFailed` (BAD_REQUEST) / `TaskNotFound` (NOT_FOUND).
- **Edit data source**: Deferred — the edit page needs the task to edit, via either a `task.get` procedure or filtering `task.list`. To be settled in the backend procedures spec.
- **Error → field errors**: The frontend assumes validation failures arrive as a field-error map on the tRPC error; the exact carrier (code/data/cause) is defined by the backend procedures spec.
- **Client validation**: Reuse `parseCreateTaskInput` / `parseUpdateTaskInput` from the shared task module directly in the browser; the server re-validates. No duplicate rules.
- **Form state**: A single `useState` form-state object (title, description, status) with controlled inputs. Input values update immediately; validation is debounced (~300ms) so parsers do not run on every keystroke; validation always runs immediately on submit and on blur. A shared `TaskForm` component serves create and edit via a `mode: "create" | "edit"` prop plus an optional `initialTask?: Task` that seeds values and switches submission to `task.update`.
- **Status labels**: The status `<select>` displays "To do", "In progress", "Done" while keeping enum values `todo` / `in_progress` / `done` on the wire. Status is editable only in edit mode (new tasks start as `todo`).
- **Component organization**: Route-specific components live under the task route as a private folder (`app/tasks/_components/`: `TaskList`, `TaskListItem`, `TaskForm`, `DeleteTaskButton`), per the project's Next.js instructions; shared/reusable components go in the top-level `components/` folder. Co-locate tests with components.
- **Feedback**: Inline field-level error text under inputs plus a single status banner above the form for mutation outcomes (success/server error). On the list, deletion uses an inline two-step confirm ("Delete?" → [Delete][Cancel]); on success the list refetches and shows a transient success message; on failure it shows the error reason. Transient messages auto-dismiss after ~3 seconds (and on the next action).
- **Post-save navigation**: After successful create or update, redirect to `/tasks`. Delete stays on the list and refetches.
- **Not-found (edit)**: If the id is malformed or the task does not exist, redirect to `/tasks`.
- **Timestamps**: `createdAt`/`updatedAt` are ISO strings end-to-end; the UI constructs `Date` objects only for display, formatted via `toLocaleString()` (browser locale).
- **Scaffolding (own PR)**: Before feature work, one PR creates stub pages for all three routes, the root redirect, an empty `_components/` directory, and adds `@testing-library/react` + `jsdom` with the vitest jsdom environment. No logic or data fetching in that PR.
- **Vertical slices**: After scaffolding — V1 list + `task.list`; V2 create + `task.create`; V3 edit + `task.update`; V4 delete + `task.delete`. Cross-cutting concerns (validation, feedback, not-found) are folded into the relevant slice rather than separate tasks.
- **Testing infra**: Dev dependencies and jsdom environment are added in the scaffolding PR, so rendering tests ship with each slice rather than later.

## Testing Decisions

- A good test exercises external behavior only: it renders components through Testing Library or calls public module/procedure interfaces and asserts on outputs, thrown errors, and visible UI — never on internals. No mocking of internal collaborators.
- **Modules tested**: `TaskForm`, `TaskList`/`TaskListItem`, `DeleteTaskButton` (rendering via Testing Library + jsdom); the tRPC procedure caller boundary for `list`/`create`/`update`/`delete` once those procedures exist; and any pure helpers extracted. Validation rules remain tested in the shared task module.
- **Prior art**: `shared/task/task.test.ts` — table-driven, pure-function tests with independent expected literals — is the pattern for procedure and helper tests. Component tests follow Testing Library conventions (query by role/text, assert user-visible outcomes).
- **Deferred (not removed)**: component rendering tests and procedure boundary tests ship with their slice, not as a later phase. Only the two design items above (edit data source, error wire format) are deferred.

## Out of Scope

- Backend storage/repository (backend item 2 spec) and tRPC procedure implementation details (backend procedures spec) — this spec declares dependencies only.
- Auth, task filtering/grouping, pagination, optimistic updates beyond refetch, and E2E tests.
- Accessibility beyond semantic HTML and ARIA basics.
- Real-time updates or polling.

## Further Notes

- Field names align with the shared task module: `title`, `description`, `status`, `createdAt`, `updatedAt`.
- Scaffolding lands first as its own PR; vertical slices follow in order V1 → V4.
- Deferred decisions are recorded above so the backend procedures spec and implementation can resolve them without re-grilling.
- The PT-BR source (`specs/source/frontend-spec.pt-BR.md`) maps to: list page (SSR, layout, delete with feedback), create/update form (functional components + hooks, validation), and feedback/error handling (loading, success, fail).

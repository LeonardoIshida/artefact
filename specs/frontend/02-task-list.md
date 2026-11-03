# Spec: Task List Page

Status: ready-for-agent
Scope: Frontend — SSR task list page, layout, display, and inline deletion.
Depends on: Spec 01 (Task domain); Spec 02 (Repository); Spec 03 (tRPC infrastructure); Spec 04 (Task procedures — `task.list`, `task.delete`); Spec 01 frontend (Task Feedback & Error Handling — banner, transient message, loading).
Sources: Grilling session (rounds 1–2, 2026-11-02); split from former Spec 04 (Task UI); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Users have no way to view their tasks in the browser: the home page is still the Next.js scaffold, there is no list, no empty state, and no deletion. Without an SSR list, the page is slow to become useful, and without inline deletion plus feedback, cleanup is awkward. The list must also stay consistent with the backend's task shape (title, description, status, timestamps).

## Solution

An SSR task list page at `/tasks` (root `/` redirects to it) that fetches `task.list` via the tRPC server caller in an async Server Component and renders tasks with their title, description, status, and timestamps. An empty list shows "No tasks yet." with a link to create one. Each item has a trash-can delete button with an inline two-step confirm; on success the list refetches and shows a transient success message, on failure it shows the error reason. Status is shown as readable labels and timestamps in local time.

## User Stories

1. As an app user, I want to see my tasks on a page that loads quickly via SSR, so I am not waiting for client fetching.
2. As an app user, I want to see each task's title, description, status, and timestamps, so I understand my work at a glance.
3. As an app user, I want an empty state with a prompt to create a task, so a blank page is not confusing.
4. As an app user, I want to delete a task directly from the list with a trash-can icon, so I can clean up quickly.
5. As an app user, I want a confirmation before deletion, so I do not delete by accident.
6. As an app user, I want feedback after deleting (success or error), so I know what happened.
7. As an app user, I want timestamps shown in my local time, so they are readable.
8. As an app user, I want status shown as readable labels (To do, In progress, Done).
9. As a frontend developer, I want route-specific components co-located under the task route, per project conventions.
10. As a developer, I want list and deletion behavior covered by tests.

## Implementation Decisions

- **Routes**: List at `/tasks`; root `/` redirects to `/tasks`. No separate delete route — deletion happens inline on the list.
- **SSR preload**: The list page is an async Server Component that fetches `task.list` via the tRPC server caller (createCallerFactory) and renders the list. A client island handles delete and refetch.
- **Display**: Each item shows title, description, status, `createdAt`, `updatedAt`. Status labels are "To do", "In progress", "Done". Timestamps are ISO strings converted to `Date` only for display via `toLocaleString()` (browser locale).
- **Empty state**: When `task.list` returns `[]`, render "No tasks yet." with a link/button to `/tasks/new`.
- **Component organization**: Route-specific components live under the task route as a private folder: `TaskList`, `TaskListItem`, `DeleteTaskButton`. Shared/reusable components go in the top-level `components/` folder (per project Next.js instructions).
- **Deletion**: `DeleteTaskButton` uses an inline two-step confirm ("Delete?" → [Delete][Cancel]). On success it refetches the list and shows a transient success message; on failure it shows the error reason. Loading state (disabled + spinner) while deleting.
- **Feedback**: Uses the shared primitives from Spec 01 (frontend): status banner, transient message, loading control.
- **Backend dependency**: `tasks.list` (status/cursor query → page) is defined by Backend Spec 07; `task.delete` is defined by Backend Spec 04. The original full-list query contract is superseded.

## Testing Decisions

- A good test exercises external behavior only: render list/item/delete-button through Testing Library and assert on visible text, disabled state, and refetch calls — never on internals.
- **Modules tested**: `TaskList`, `TaskListItem`, `DeleteTaskButton` (rendering), and the `task.list` / `task.delete` caller boundary.
- **Prior art**: `shared/task/task.test.ts` for pure helpers; component tests follow Testing Library conventions.
- **Loading state and empty state** are asserted via visible output.

## Out of Scope

- Create/update form and validation (Spec 03 frontend).
- Feedback primitives themselves (Spec 01 frontend) — consumed here, not defined here.
- Backend storage and procedure implementation (Specs 01–04 backend).
- Auth, filtering beyond the status lanes, and optimistic updates beyond refetch. Pagination/infinite scroll is defined by Frontend Spec 08, which supersedes this spec's pagination exclusion. E2E tests remain out of scope.

## Further Notes

- This spec depends on Spec 01 (frontend) for feedback primitives; implement that first.
- Timestamps remain ISO strings on the wire; `Date` is constructed only for display.
- The full-list and pagination decisions here are superseded by `specs/backend/07-task-pagination.md` and `specs/frontend/08-task-infinite-scroll.md`.

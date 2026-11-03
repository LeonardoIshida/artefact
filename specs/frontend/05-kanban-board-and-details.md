# Spec: Kanban Board and Task Details

Status: ready-for-agent
Scope: Frontend — four-column Kanban board, task cards, task detail dialog, delete confirmation, empty states, and responsive layout. Supersedes visual and interaction decisions in `specs/frontend/02-task-list.md`.
Depends on: Spec 01 (Task domain — entity, status enum, timestamps); Spec 04 (Task procedures — `task.list`, `task.delete`); Spec 05 backend (SSR bridge — prefetch, HydrateClient); Spec 04 frontend (UI foundation — shadcn components, AppHeader, feedback primitives).
Sources: UI redesign grilling session (rounds 1–3, 2026-11-02); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

The current task list is a plain `<ul>` of items with no visual hierarchy, no status grouping, and no way to see task details without navigating to the edit page. Users cannot quickly scan their work by status, and there is no persistent create affordance on the board. Without a Kanban-style layout, the app feels like a scaffold rather than a usable task manager.

## Solution

A four-column Kanban board (New Task, To Do, In Progress, Done) at `/tasks`. Each task is a card showing the title, status badge, and pencil/trash icons. Clicking a card opens a detail dialog showing the full task (title, description, status, timestamps) with edit and delete actions. A dedicated "New Task" column on the far left provides a persistent create affordance. Columns stack vertically on mobile. Deletion uses a shadcn `AlertDialog` confirmation. Drag-and-drop is out of scope for this pass.

## User Stories

1. As an app user, I want to see my tasks grouped by status in three columns (To Do, In Progress, Done), so I can scan my work at a glance.
2. As an app user, I want a fourth "New Task" column on the left with a prominent create button, so I always know how to add a task.
3. As an app user, I want each task shown as a card with its title, status badge, and edit/delete icons, so the board is clean and scannable.
4. As an app user, I want to click a card to see its full details (description, timestamps) in a dialog, so I don't lose my board context.
5. As an app user, I want to edit a task from the detail dialog (pencil icon), so I can quickly update it.
6. As an app user, I want to delete a task from the detail dialog or card (trash icon) with a confirmation dialog, so I don't delete by accident.
7. As an app user, I want empty columns to show a short "No tasks" message, so the board doesn't look broken.
8. As an app user, I want the board to work on mobile (columns stacked vertically), so I can manage tasks on my phone.
9. As an app user, I want the board to load instantly via SSR, so I see my tasks immediately.
10. As an app user, I want feedback after deleting (success or error), so I know what happened.
11. As a frontend developer, I want task cards to be a reusable component, so they're consistent and testable.
12. As a developer, I want board behavior covered by tests (columns, ordering, detail dialog, delete confirmation).

## Implementation Decisions

- **Board layout**: Four columns — "New Task" (leftmost), "To Do", "In Progress", "Done". On desktop, all four are side-by-side (responsive grid/flex). On mobile, columns stack vertically. Each column has a header with its label; task-count badges are removed by Frontend Spec 08.
- **New Task column**: Always visible as the first column. Contains a prominent "Create task" card/button linking to `/tasks/new`. No task count (it's not a status). This replaces the global empty-state — the board is never fully empty because the New Task column is always present.
- **Task cards**: Each card shows the title, a status badge (colored per status), and two icon buttons: pencil (edit → opens edit form or detail dialog with edit action) and trash (delete → opens confirmation dialog). No description or timestamps on the card — those appear in the detail dialog. Cards are clickable (main area) to open the detail dialog.
- **Task detail dialog**: A shadcn `Dialog` opened by clicking a card. Shows the full task: title, description (or "No description"), status badge, `createdAt`, `updatedAt` (formatted via `toLocaleString()`). Contains pencil (edit) and trash (delete) icon buttons. Closing the dialog returns to the board.
- **Delete confirmation**: The trash icon opens a shadcn `AlertDialog` naming the task ("Delete 'Task title'?"). Buttons: Cancel (secondary) and Delete (destructive). Controls are disabled while the delete request is pending. On success: list refetches + transient success message. On failure: transient error message with the reason.
- **Empty columns**: Each status column shows a short "No tasks" message when empty. The New Task column is never empty (always has the create button).
- **Column ordering**: Columns in order: New Task, To Do, In Progress, Done. Within each column, tasks preserve the backend's order (`updatedAt` desc, insertion tiebreak).
- **SSR preload**: The board page (`/tasks`) renders the first page for each status lane via the SSR bridge (Backend Spec 05 and Backend Spec 07), then hydrates the corresponding client state. Frontend Spec 08 defines the paginated cache and continuation behavior; full-list preload is superseded.
- **Component organization**: Route-specific components under `app/tasks/_components/`: `TaskBoard`, `TaskCard`, `TaskDetailDialog`, `DeleteTaskDialog`. Shared components (`AppHeader`) in `components/`.
- **Status badge colors**: todo = gray/neutral, in_progress = blue, done = green. Consistent with the foundation spec.
- **Responsive**: Desktop: 4 columns side-by-side (CSS grid, `grid-cols-4` or flex with min-width). Mobile: columns stack vertically, each full-width. No horizontal scrolling.
- **No drag-and-drop**: Status changes happen via the edit form (pencil → edit page → status select → save). Drag-and-drop is deferred to a future feature.

## Testing Decisions

- A good test exercises external behavior only: render the board through Testing Library and assert on visible text, accessible roles, and user interactions — never on Tailwind classes or shadcn internals.
- **Modules tested**: `TaskBoard` (column rendering, empty states, task distribution across columns), `TaskCard` (title, status badge, icon buttons, click-to-open-detail), `TaskDetailDialog` (full task display, edit/delete actions), `DeleteTaskDialog` (confirmation flow, pending state).
- **Prior art**: `components/TaskList.test.tsx` and `components/TaskListItem.test.tsx` (existing rendering + deletion tests); `shared/task/task.test.ts` for pure helpers. Component tests follow Testing Library conventions.
- **TDD**: per the coding standards, built in vertical red-green slices — board columns + empty state first, then cards with icons, then detail dialog, then delete confirmation dialog.

## Out of Scope

- Drag-and-drop between columns (deferred).
- Task filtering or search. Pagination and infinite-scroll behavior are defined by Frontend Spec 08; this spec's pagination exclusion is superseded.
- Animations or transitions beyond shadcn defaults.
- Dark mode.
- Backend changes (storage, procedures, error taxonomy).

## Further Notes

- This spec supersedes the visual and interaction decisions in `specs/frontend/02-task-list.md` (plain `<ul>` list, two-step inline delete confirm, empty state with "No tasks yet."). The CRUD, validation, SSR, and error contracts remain unchanged.
- The original PT-BR requirements are preserved under `specs/source/`.
- The detail dialog uses the task data already loaded for the board (no additional fetch). The edit pencil navigates to `/tasks/[id]/edit` which fetches the task via SSR.
- `specs/frontend/08-task-infinite-scroll.md` supersedes the task-count and pagination decisions here while retaining this spec's board layout, card, detail, and delete behavior.

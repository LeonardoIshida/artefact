# Spec: Task Drag and Drop

Status: ready-for-agent
Scope: Frontend — drag-and-drop moving of task cards between Kanban status columns.
Depends on: Frontend Spec 05 (Kanban board & details); Frontend Spec 08 (Task infinite scroll); Backend Spec 07 (Task pagination); Backend Spec 04 (Task procedures — `tasks.update`).
Sources: Drag-and-drop grilling session (2026-11-03); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Moving a task between statuses currently requires opening the edit form, changing the status select, and saving. That is slow for the common "move this task to the next column" action and breaks the Kanban's at-a-glance workflow. The board needs a direct, pointer-driven way to move a card between the To Do, In Progress, and Done columns, while preserving the existing pagination, ordering, and mutation-reset contracts.

## Solution

Add pointer-driven drag-and-drop between the three status columns using `@dnd-kit/core`. Each card gets a dedicated drag handle; dropping a card onto a column moves the task to that status via the existing `tasks.update` procedure, then resets all lanes. Columns highlight while hovered, and a floating overlay follows the pointer. Mobile keeps the edit-form status change (no drag). The feature is mouse/pointer only; keyboard drag is intentionally deferred.

## User Stories

1. As a user, I want to drag a task card from one status column to another, so I can change its status without opening the edit form.
2. As a user, I want a clear drag handle on each card, so dragging does not conflict with clicking the card to view details or using its edit/delete buttons.
3. As a user, I want the target column to highlight while I drag over it, so I know where the card will land.
4. As a user, I want the card to follow my pointer during the drag, so the interaction feels direct.
5. As a user, I want the board to stay stable (no layout jumps) while dragging, so infinite-scroll sentinels are not disrupted.
6. As a user, I want a moved task to appear at the top of its new column after the server confirms, so ordering stays consistent with `updatedAt`.
7. As a user, I want a failed move to leave the card where it was and show an error, so I never lose track of a task.
8. As a developer, I want drag-and-drop to reuse the existing `tasks.update` mutation and lane-reset flow, so there is no second status-change path to maintain.

## Implementation Decisions

- **Dependency**: add `@dnd-kit/core` (and `@dnd-kit/utilities` for transforms). No sortable list package is needed because intra-column reordering is out of scope. No other DnD library.
- **Desktop only**: enable drag-and-drop at the `xl` breakpoint (columns side-by-side). On smaller breakpoints, render cards without a drag handle and rely on the edit form's status select. This keeps the stacked mobile layout simple.
- **Drag source**: a dedicated drag handle (grip icon button) on each `TaskCard`, using `@dnd-kit`'s `useDraggable`. The card's main button still opens the detail dialog; edit/delete buttons remain independently clickable. The handle is the only drag initiator.
- **Drop targets**: one droppable container per status column (the column's card list area), using `@dnd-kit`'s `useDroppable`. Dropping anywhere in a column moves the task to that status.
- **Collision detection**: `rectIntersection` from `@dnd-kit/core`, so the hovered column is determined by pointer/column overlap.
- **Drag overlay**: render a `DragOverlay` containing a clone of the dragged card that follows the pointer. The source card stays in place and is visually dimmed while dragging; no DOM reordering occurs mid-drag, so scroll sentinels are not disturbed.
- **Drop feedback**: highlight the hovered target column (border/background change via conditional Tailwind classes) while dragging. No animated transitions beyond shadcn defaults.
- **Move mutation**: reuse `tasks.update` with the dragged task's current `title`, `description`, and the target `status`. Do not add a separate status-only procedure. The backend bumps `updatedAt` and reshuffles ordering as it already does.
- **Placement**: server-confirmed. While a move is pending, disable further drags on that card and show its spinner in place. On success, reset all three lanes (`utils.tasks.list.reset` for todo/in_progress/done) so the moved task appears at the top of its target column. On failure, leave the card in its source column and show a transient error.
- **Infinite scroll**: DnD does not special-case pagination. Because every successful move resets all lanes to their first pages, the moved task lands at the top of its target lane and ordering stays consistent. Dragging a card from a later page is allowed; the reset discards accumulated pages.
- **Accessibility (known gap)**: drag-and-drop is pointer-only in this pass (no `KeyboardSensor`). This is a deliberate simplification and a documented WCAG 2.2 AA gap; keyboard status changes remain available through the edit form. Cross-reference `specs/frontend/07-accessibility-and-ux.md`.
- **No new backend seam**: status changes already go through `tasks.update`; no repository or procedure changes are required.

## User Stories

1. As a user, I want to drag a task card from one status column to another, so I can change its status without opening the edit form.
2. As a user, I want a clear drag handle on each card, so dragging does not conflict with clicking the card to view details or using its edit/delete buttons.
3. As a user, I want the target column to highlight while I drag over it, so I know where the card will land.
4. As a user, I want the card to follow my pointer during the drag, so the interaction feels direct.
5. As a user, I want the board to stay stable (no layout jumps) while dragging, so infinite-scroll sentinels are not disrupted.
6. As a user, I want a moved task to appear at the top of its new column after the server confirms, so ordering stays consistent with `updatedAt`.
7. As a user, I want a failed move to leave the card where it was and show an error, so I never lose track of a task.
8. As a developer, I want drag-and-drop to reuse the existing `tasks.update` mutation and lane-reset flow, so there is no second status-change path to maintain.

## Testing Decisions

- **Board render seam**: render `TaskBoard` with the real tRPC procedure and in-memory repository. Stub only the pointer/DnD events at the browser boundary. Assert that dragging a card's handle and dropping onto another column calls `tasks.update` with the task id and target status, and that the card appears in the target column after success.
- **Failure seam**: make the move mutation fail and assert the card stays in its source column and a transient/lane-local error is shown.
- **Assertions**: exercise visible text, accessible roles, and resulting task distribution across columns. Do not assert Tailwind classes, DnD library internals, or transform values.
- **Prior art**: `TaskBoard.test.tsx`, `TaskCard.test.tsx`, `TaskForm.test.tsx`, and `TaskList.test.tsx` establish the component-testing conventions; backend mutation behavior is covered by `server/routers/task.test.ts`.

## Out of Scope

- Intra-column reordering (would require a new ordering concept beyond `updatedAt`-descending).
- Keyboard-driven drag-and-drop (deferred; status changes remain available via the edit form). Documented as a WCAG 2.2 AA gap.
- Mobile/touch drag-and-drop (deferred; mobile uses the edit-form status select).
- Dragging into the "New Task" column (it is a create affordance, not a status).
- Backend procedure or repository changes.
- Animations or transitions beyond shadcn defaults and `@dnd-kit`'s defaults.

## Further Notes

- This spec supersedes the "Drag-and-drop between columns (deferred)" and "No drag-and-drop" statements in `specs/frontend/05-kanban-board-and-details.md`.
- Cross-reference `specs/frontend/07-accessibility-and-ux.md` for the keyboard-operability gap.
- The backend contract is unchanged: `tasks.update` already bumps `updatedAt` and the repository already reshuffles ordering; lane resets follow Frontend Spec 08.
- `@dnd-kit/core` (and `@dnd-kit/utilities`) must be added to `package.json`; no other DnD library.
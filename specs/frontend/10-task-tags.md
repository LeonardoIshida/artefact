# Spec: Task Tags

Status: ready-for-agent
Scope: Shared domain, backend, and frontend — custom tags on tasks (name + color), replacing the redundant status badge on cards.
Depends on: Backend Spec 01 (Task domain — entity, validation, errors); Backend Spec 02 (Repository); Backend Spec 04 (Task procedures); Frontend Spec 03 (Task form); Frontend Spec 05 (Kanban board & details); Frontend Spec 07 (Accessibility & UX).
Sources: Custom-tags grilling session (2026-11-03); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Each Kanban card currently renders a `TaskStatusBadge` whose label duplicates the column name ("To do" inside the To Do column). That badge is redundant noise. At the same time, tasks have no way to carry user-defined labels (e.g. "urgent", "frontend"), which would be more useful than restating the status. The app needs custom tags: free-text names with a chosen color from a fixed palette, shown on cards and in the detail dialog, editable in the create/edit forms, and stored on the task.

## Solution

Add a `tags` field to `Task` as an array of `{ name, color }` objects, where `color` is one of a shared palette of eight accessible colors. Tags are free-text (no global catalog): the user types a name and picks a color from the palette. Tags replace the status badge on cards. The backend validates and persists tags through the existing `tasks.create`/`tasks.update` procedures (no new procedures). Cards show up to 2 tags plus a `+N` overflow chip; the detail dialog shows the full list.

## User Stories

1. As a user, I want to add one or more custom tags to a task, so I can label work in a way that is meaningful to me.
2. As a user, I want each tag to have a name and a color from a fixed palette, so tags are visually distinguishable without arbitrary color input.
3. As a user, I want tags to appear on task cards instead of the redundant status badge, so cards stay scannable.
4. As a user, I want to see all tags in the task detail dialog, so no label is hidden when I inspect a task.
5. As a user, I want to add and remove tags in the create and edit forms, so I can manage labels while editing.
6. As a user, I want duplicate tags (case-insensitive) rejected, so a task never lists the same label twice.
7. As a developer, I want tags to ride on the existing `tasks.create`/`tasks.update` contracts, so there is no second mutation path.

## Implementation Decisions

### Shared domain

- **Palette:** `TAG_COLORS = ["red", "orange", "amber", "green", "blue", "violet", "pink", "gray"] as const` in `shared/task/entity.ts`. Frontend maps each key to Tailwind classes; backend only validates membership.
- **Tag shape:** `TaskTag = { name: string; color: TagColor }`.
- **Entity:** `Task` gains `tags: TaskTag[]`. `CreateTaskInput` gains optional `tags?: TaskTag[]` (defaults to `[]`). `UpdateTaskInput` gains required `tags: TaskTag[]` (PUT full replace; send `[]` to clear).
- **Limits:** max 5 tags per task; tag name max 20 chars after trim; empty/whitespace-only names rejected; case-insensitive dedup within a task (canonical casing = first occurrence wins).
- **Validation:** hand-rolled in `parseCreateTaskInput`/`parseUpdateTaskInput`. Unknown keys rejected (existing strict-input rule). Invalid color or oversized/empty/duplicate tag → `ValidationFailed` with a `tags` field error. No new domain error type.
- **Repository:** no stamping or pagination change. Tags are persisted as part of the task; `listPage` items already include the full `Task`, so tags travel with pages. Seed tasks get `tags: []`.

### Backend

- `tasks.create` and `tasks.update` accept and persist tags through the existing procedures; no new procedure. `tasks.list`/`tasks.get` return tags automatically.
- No repository interface change beyond the entity.

### Frontend

- **Status badge removal:** remove `TaskStatusBadge` usage from `TaskCard` and `TaskDetailDialog`. The status remains the column grouping and the edit-form selector. `TaskStatusBadge.tsx` may be deleted if unused.
- **Card tags:** render up to 2 tag chips (name + color class) on each card, then a `+N` chip when more than 2. Chips are non-interactive display elements.
- **Detail dialog:** render the full tag list.
- **Form (create & edit):** a tag editor — text input plus a color picker (palette buttons). Enter/comma adds a tag; Backspace removes the last; each chip has a remove button. Inline validation shows field errors. In edit mode, tags are edited directly (not part of the comparison diff); current tags are shown above the editor for reference.
- **Color mapping:** a small `lib/tag-colors.ts` (or inline in the badge) maps palette keys to Tailwind classes, consistent with `STATUS_COLORS`.

### Accessibility

- Tag chips use text + color (never color alone). Color picker buttons have accessible names. Remove buttons have `aria-label`. Contrast follows the existing palette audit.

## User Stories

1. As a user, I want to add one or more custom tags to a task, so I can label work meaningfully.
2. As a user, I want each tag to have a name and a color from a fixed palette, so tags are visually distinguishable.
3. As a user, I want tags to appear on task cards instead of the redundant status badge, so cards stay scannable.
4. As a user, I want to see all tags in the task detail dialog.
5. As a user, I want to add and remove tags in the create and edit forms.
6. As a user, I want duplicate tags (case-insensitive) rejected.
7. As a developer, I want tags to ride on the existing `tasks.create`/`tasks.update` contracts.

## Testing Decisions

- **Shared validation seam**: `parseCreateTaskInput`/`parseUpdateTaskInput` accept/reject tags (count, length, duplicate, color, unknown keys) — pure function tests with independent literals.
- **Repository seam**: tags round-trip through create/update/get and survive pagination.
- **Procedure seam**: `tasks.create`/`tasks.update` accept tags and surface `BAD_REQUEST` with field errors.
- **Component seam**: `TaskCard` renders tag chips with color classes (up to 2 + `+N`); `TaskForm` add/remove/pick-color behavior; `TaskDetailDialog` renders the full tag list.
- **Prior art**: `shared/task/task.test.ts`, `server/routers/task.test.ts`, `app/tasks/_components/TaskCard.test.tsx`, `TaskForm.test.tsx`.

## Out of Scope

- Filtering or searching tasks by tag.
- A global tag catalog / tag management screen.
- Tag-based sorting or grouping.
- Backend procedure or repository changes beyond persisting the new field.
- Keyboard drag-and-drop (unrelated; already deferred).

## Further Notes

- This spec supersedes the status-badge display on cards (Frontend Spec 05) and the `Task` entity field list (Backend Spec 01). Those specs' status-column grouping and edit-form status selector remain unchanged.
- Color palette defined once in `shared/task/entity.ts` (`TAG_COLORS`) and mapped to Tailwind classes on the frontend; backend validates membership only.
- Seed tasks get `tags: []`.
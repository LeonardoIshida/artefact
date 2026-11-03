# Artefact — Task Manager

A simple Next.js task manager. Tasks are kept in memory on the server (no database) and exposed to the frontend through tRPC.

## Features

- Kanban board grouped by status: **To do**, **In progress**, **Done**, plus a persistent **New Task** column.
- Create, edit, and delete tasks with inline validation and feedback.
- Server-side rendering of the first page of each status lane, with incremental (infinite) loading as you scroll.
- Drag and drop tasks between columns (desktop).
- Custom tags (name + color) on tasks.
- Accessible UI (skip link, focus management, ARIA, reduced motion, error/loading states).

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- tRPC 11 + TanStack React Query 5
- Tailwind CSS 4, shadcn/ui components

## Getting started

### Prerequisites

- Node.js 20+
- pnpm (the project pins `pnpm@12.16.1`)

### Install

```bash
pnpm install
```

### Run in development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects `/` to `/tasks`.

### Run tests

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

### Production build

```bash
pnpm build
pnpm start
```

## How it works

- **Backend** (`server/`): a tRPC router (`tasks`) wraps a `TaskRepository` interface implemented by an in-memory adapter (`server/repositories/in-memory-task-repository.ts`). Tasks are seeded with sample tasks on first boot (15 in the "To do" column so infinite scroll is exercisable). The adapter is instantiated in a single composition point (`server/composition.ts`).
- **Domain** (`shared/task/`): entity, validation (hand-rolled, no zod), errors, and the repository interface. Validation is pure and framework-free.
- **SSR** (`server/prefetch.tsx`, `app/tasks/page.tsx`): the list page prefetches the first page of each status lane on the server and hydrates the React Query cache.
- **Frontend** (`app/tasks/`): `TaskList` holds one infinite query per status lane; `TaskBoard` renders columns, cards, detail/delete dialogs, and drag-and-drop.

### Bonus: infinite scroll (per column)

Incremental loading is implemented **per status column**, not as a single page-wide list. Each of the three lanes (`todo`, `in_progress`, `done`) keeps its own paginated query state and cursor:

- SSR prefetches the first page (10 tasks) for all three lanes in `app/tasks/page.tsx` via `helpers.trpc.tasks.list.prefetchInfinite`.
- `app/tasks/_components/TaskList.tsx` creates one `trpc.tasks.list.useInfiniteQuery({ status })` per lane, with `getNextPageParam` reading `page.nextCursor`.
- `app/tasks/_components/TaskBoard.tsx` places a sentinel after each lane's loaded cards and uses an `IntersectionObserver` (rooted in the lane's scroll container on desktop, the page viewport on mobile) to fetch the next page; a manual "Load more" button is also provided as a fallback. Short lanes auto-fill while the sentinel stays in view.
- Backend pagination contract: `server/routers/task.ts` (`tasks.list` with `{ status, cursor? }` → `{ items, nextCursor }`) and `server/repositories/in-memory-task-repository.ts` (`listPage`, page size 10, opaque cursor preserving `updatedAt`-desc + insertion-order tie-break). Invalid/wrong-status cursors return `BAD_REQUEST`.
- On any successful mutation (create/update/delete), all three lanes are reset to their first pages to avoid stale pages, duplicates, or gaps.
- Specs: `specs/frontend/08-task-infinite-scroll.md` and `specs/backend/07-task-pagination.md`.

## Project structure

- `app/` — Next.js pages, layouts, components, route handlers.
- `server/` — tRPC init, routers, repositories, composition, SSR helpers.
- `shared/` — framework-free domain code (entity, errors, repository, validation).
- `specs/` — feature specifications.
- `public/` — static assets.

## Notes

- Data is in-memory: restarting the dev server resets tasks to the seeded state.
- Drag-and-drop is pointer-only (keyboard status changes remain available via the edit form).
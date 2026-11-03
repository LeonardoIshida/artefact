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

- **Backend** (`server/`): a tRPC router (`tasks`) wraps a `TaskRepository` interface implemented by an in-memory adapter (`server/repositories/in-memory-task-repository.ts`). Tasks are seeded with three sample tasks on first boot. The adapter is instantiated in a single composition point (`server/composition.ts`).
- **Domain** (`shared/task/`): entity, validation (hand-rolled, no zod), errors, and the repository interface. Validation is pure and framework-free.
- **SSR** (`server/prefetch.tsx`, `app/tasks/page.tsx`): the list page prefetches the first page of each status lane on the server and hydrates the React Query cache.
- **Frontend** (`app/tasks/`): `TaskList` holds one infinite query per status lane; `TaskBoard` renders columns, cards, detail/delete dialogs, and drag-and-drop.

## Project structure

- `app/` — Next.js pages, layouts, components, route handlers.
- `server/` — tRPC init, routers, repositories, composition, SSR helpers.
- `shared/` — framework-free domain code (entity, errors, repository, validation).
- `specs/` — feature specifications.
- `public/` — static assets.

## Notes

- Data is in-memory: restarting the dev server resets tasks to the seeded state.
- Drag-and-drop is pointer-only (keyboard status changes remain available via the edit form).
# Spec: UI Foundation and App Shell

Status: ready-for-agent
Scope: Frontend — shadcn/ui setup, light theme, header/navigation, and restyled shared feedback primitives. Supersedes conflicting visual and interaction decisions in `specs/frontend/01-task-feedback.md`.
Depends on: Spec 01 (Task domain — entity, validation, error taxonomy); Spec 03 (tRPC infrastructure — client provider, SSR caller); Spec 04 (Task procedures — error mapping to tRPC codes); Spec 06 (Error contract — fieldErrors as array of { field, message }).
Sources: UI redesign grilling session (rounds 1–3, 2026-11-02); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

The current frontend is unstyled: the root layout has no header or navigation, task components use no Tailwind classes, and feedback primitives are plain markup. Without a shared visual foundation, each page will invent its own styling, shadcn/ui components will be adopted inconsistently, and the app will look like the default Next.js scaffold. Users have no way to navigate between the task list and task creation from a persistent header.

## Solution

Set up shadcn/ui (CLI-generated, locally owned components) with a clean light theme and neutral surfaces, add a persistent header with navigation (Tasks and New Task), and restyle the existing feedback primitives (status banner, transient message, field errors, loading spinner) using shadcn components. Tailwind CSS v4 stays as the styling engine; no dark-mode toggle in this pass. Field-error rendering is updated to consume the backend's `fieldErrors` array (Spec 06) instead of a flat map.

## User Stories

1. As an app user, I want a persistent header with navigation to the task list and task creation, so I can move between pages without using the browser back button.
2. As an app user, I want a clean, presentable light theme with consistent spacing and typography, so the app looks professional.
3. As an app user, I want status badges (To do, In progress, Done) with distinct colors, so I can visually distinguish task states.
4. As an app user, I want success and error feedback restyled with shadcn components, so messages are visually clear and consistent.
5. As an app user, I want field-level errors displayed under the relevant input with shadcn styling, so I know exactly what to fix.
6. As an app user, I want loading states (disabled button + spinner) to use shadcn components, so they look polished.
7. As a frontend developer, I want shadcn components installed locally (not as a dependency), so they can be customized without upstream constraints.
8. As a frontend developer, I want a single design token set (colors, spacing, radius), so all components share one visual language.
9. As a developer, I want the header and feedback primitives covered by tests, so regressions are caught.

## Implementation Decisions

- **shadcn/ui setup**: Install via CLI with the default configuration. Components are generated into a local `components/ui/` directory (not a package dependency). Tailwind v4 configuration stays as-is (CSS-based, no `tailwind.config.ts`). Add `lucide-react` for icons (pencil, trash, etc.).
- **Theme**: Light mode only. Neutral surface colors (zinc/slate palette) with a single accent color for primary actions. Status badge colors: todo = gray, in_progress = blue, done = green. No dark-mode toggle in v1.
- **Header**: A top-level `AppHeader` component rendered in the root layout (`app/layout.tsx`). Contains the app name/logo on the left and two navigation links on the right: "Tasks" (→ `/tasks`) and "New Task" (→ `/tasks/new`). Active route is highlighted. The header is a Server Component where possible; navigation links use Next.js `Link`.
- **Feedback primitives restyling**: The existing primitives (`StatusBanner`, `FieldError`, `Spinner`, `TransientMessage`) in `components/` are restyled with shadcn components (`Alert`, `AlertDescription`, `Spinner` or custom). No toast library — feedback stays inline.
- **Field error contract**: The UI reads `error.data.fieldErrors` as `Array<{ field: string; message: string }>` (per the backend error contract). It groups errors by `field` and renders all messages under the corresponding input. This replaces the previous assumption of a flat field-error map.
- **Transient message**: Auto-dismiss after ~3 seconds (and on next action). Restyled with shadcn `Alert` or a simple styled div. No manual dismiss button.
- **Component location**: shadcn components in `components/ui/`; app-specific shared components (`AppHeader`, restyled feedback primitives) in `components/`; route-specific components in `app/tasks/_components/`.
- **No component library beyond shadcn**: No dashboard framework, no Kanban library, no toast library. The board is built with standard HTML + Tailwind + shadcn primitives.

## Testing Decisions

- A good test exercises external behavior only: render the component through Testing Library and assert on visible text, accessible roles, and navigation — never on Tailwind classes or shadcn internals.
- **Modules tested**: `AppHeader` (navigation links, active state), restyled `StatusBanner` (success/error rendering), `FieldError` (conditional rendering with array of errors), `Spinner` (labeled loading state), `TransientMessage` (auto-dismiss timing).
- **Prior art**: `components/StatusBanner.test.tsx`, `components/FieldError.test.tsx`, `components/Spinner.test.tsx`, `components/TransientMessage.test.tsx` — existing tests assert visible text and roles; the redesign preserves these contracts while improving styling.
- **TDD**: per the coding standards, built in vertical red-green slices — header first (navigation), then feedback primitives (restyled), then integration with task pages.

## Out of Scope

- The Kanban board and task cards (Spec 05).
- The comparison form (Spec 06).
- Dark mode toggle.
- Animations or transitions beyond shadcn defaults.
- Responsive breakpoints beyond the board (Spec 05).

## Further Notes

- This spec supersedes the visual decisions in `specs/frontend/01-task-feedback.md` (unstyled primitives, flat field-error map assumption). The CRUD, validation, and error contracts remain unchanged.
- The backend error contract (Spec 06 backend) now sends field errors as an array; the UI must group by `field` when rendering.
- The original PT-BR requirements are preserved under `specs/source/`.
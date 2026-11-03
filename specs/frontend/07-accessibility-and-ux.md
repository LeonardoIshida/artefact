# Spec: Accessibility & UX Polish

Status: ready-for-agent
Scope: Frontend — accessibility (WCAG 2.2 AA), loading/empty/error states, focus management, and form UX polish across the task app.
Depends on: Spec 01 (Task domain); Spec 03 (tRPC infrastructure); Spec 04 (Task procedures); Spec 06 (Error contract); Spec 04 frontend (UI foundation & app shell — shadcn, header, Kanban board); Spec 05 frontend (Kanban board & details); Spec 06 frontend (Task form comparison).
Sources: WCAG 2.2 quick reference (w3.org/WAI/WCAG22/quickref); `.github/instructions/nextjs.instructions.md`; AGENTS.md coding standards; code audit of `origin/main` (91c36e3) — lint, build, tests, and component review.

## Problem Statement

The app is functional and visually restyled, but its accessibility and UX polish are incomplete: there is no skip link or focus management on route changes, pages have no per-route titles, form inputs do not expose validation state to assistive technology, icon buttons may fall below the minimum target size, transitions ignore `prefers-reduced-motion`, transient messages auto-dismiss with no pause control, loading states render a blank fallback, and there is no error boundary. Lint also reports errors (JSX in try/catch, ref access during render, unused import). Without a single definition of these requirements, the gaps will be fixed inconsistently or not at all, and the app will fail a WCAG 2.2 AA audit.

## Solution

A single accessibility-and-UX pass that brings the app to WCAG 2.2 AA and a polished UX: a skip link and focus management in the app shell, per-route metadata, accessible form inputs (aria-invalid/aria-describedby/aria-required), minimum touch targets, reduced-motion support, skeletons and error boundaries for loading/error states, an adjustable auto-dismiss for transient messages, and corrected lint errors. All changes reuse the existing shadcn components and design tokens; no new dependencies.

## User Stories

1. As a keyboard user, I want a "Skip to main content" link, so I can bypass the header on every page.
2. As a keyboard user, I want focus moved to the main content after navigation, so I am not left at the top of the page.
3. As a screen-reader user, I want each page to have a descriptive title, so I know where I am.
4. As a screen-reader user, I want form inputs to announce their invalid state and associated error text, so I know what to fix.
5. As a screen-reader user, I want required fields marked as required, so I know which inputs are mandatory.
6. As a screen-reader user, I want transient success/error messages announced via live regions, so I am informed of outcomes.
7. As a user with motor impairments, I want all interactive targets to be at least 24×24 CSS pixels, so I can click them reliably.
8. As a user with vestibular disorders, I want animations and transitions disabled when `prefers-reduced-motion` is set, so the UI does not cause discomfort.
9. As a user, I want a visible loading state (skeleton) instead of a blank screen, so I know the app is working.
10. As a user, I want a friendly error page with a retry action when something fails, so I can recover.
11. As a user, I want transient messages to stay long enough to read and to be pausable/dismissible, so I am not rushed.
12. As a user, I want focus not to be hidden behind the sticky header, so I can see where I am.
13. As a developer, I want lint to pass cleanly, so CI is green and code quality is enforced.
14. As a developer, I want accessibility and UX behavior covered by tests, so regressions are caught.

## Implementation Decisions

- **Skip link**: Add a visually-hidden "Skip to main content" link as the first focusable element in `app/layout.tsx`, targeting `#main-content`. The `<main>` element gets `id="main-content"` and `tabIndex={-1}` so it can receive focus.
- **Focus management on navigation**: A small client component (`FocusOnRouteChange`) rendered in the layout calls `usePathname` and, on change, moves focus to `#main-content` (with a short `requestAnimationFrame` to ensure render). Respects `prefers-reduced-motion` (instant focus, no scroll animation).
- **Per-route metadata**: Add `export const metadata` (or `generateMetadata`) to `app/tasks/page.tsx`, `app/tasks/new/page.tsx`, and `app/tasks/[id]/edit/page.tsx` with descriptive titles (e.g., "Tasks | Artefact", "New Task | Artefact", "Edit Task | Artefact"). Root metadata already set.
- **Form input accessibility**: In `TaskForm`, set `aria-invalid={!!fieldErrors.title}` (etc.), `aria-describedby` pointing to the `FieldError` element's id when an error exists, and `aria-required` on the title input. `FieldError` renders with an `id` derived from the field name (e.g., `title-error`) so `aria-describedby` can reference it. `FieldError` already uses `role="alert"`.
- **Target size**: Ensure interactive icon buttons (`TaskCard` edit/delete, `DeleteTaskDialog` actions) meet 24×24 CSS px minimum. Use `size="icon"` (not `icon-sm`) for icon-only buttons, or add min-width/min-height. Verify the shadcn `Button` size variants.
- **Reduced motion**: Add a global CSS rule in `globals.css`: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`. Also guard any JS-driven animations (none currently).
- **Loading states**: Add `app/tasks/loading.tsx` with a skeleton matching the board layout (shadcn `Skeleton`). Replace the `Suspense fallback={null}` in `tasks/page.tsx` and `tasks/[id]/edit/page.tsx` with a skeleton fallback. Add `app/tasks/[id]/edit/loading.tsx` or reuse a shared skeleton.
- **Error boundary**: Add `app/tasks/error.tsx` (client component) rendering a friendly message with a "Try again" button (calls `reset`). Use shadcn `Alert` + `Button`.
- **Auto-dismiss timing**: Change `TransientMessage` default duration from 3000ms to 5000ms, and add a pause-on-hover/focus behavior (clear timeout on hover/focus, restart on leave). Provide a manual dismiss (close) button as an alternative to auto-dismiss. This addresses WCAG 2.2.1 (Timing Adjustable) partially — pausing is the key requirement.
- **Status messages (aria-live)**: Ensure `TransientMessage` and `StatusBanner` use `aria-live="polite"` for success and `aria-live="assertive"` for errors (in addition to role). Currently role="status"/"alert" implies live region, but explicit `aria-live` improves reliability.
- **Focus not obscured**: Ensure the sticky header does not obscure focused elements. Add `scroll-margin-top` to focusable elements, or ensure `main` has sufficient top padding. Use CSS `scroll-padding-top` on `html` matching header height.
- **Lint cleanup**: Fix the 2 lint errors (JSX in try/catch in edit page; ref access during render in TransientMessage) and 2 warnings (unused `notFound` import; unused `createQueryClient` re-export in prefetch). These are code-quality prerequisites.
- **Color contrast**: Audit status badge colors (todo=gray, in_progress=blue, done=green) and text on surfaces against WCAG AA (4.5:1 text, 3:1 non-text). Document the audit result; fix any failing pairs. (This is a verification step; specific fixes depend on audit.)
- **Component location**: Skip link and focus component in `components/` (shared). Loading/error files in `app/tasks/`. Skeletons can reuse shadcn `Skeleton` (`components/ui/skeleton.tsx` — add if missing).

## Testing Decisions

- A good test exercises external behavior only through the public interface (render via Testing Library, assert on visible text/roles/attributes).
- **Modules tested**: SkipLink, FocusOnRouteChange (focus moves to main), page metadata (title), form inputs (aria-invalid/aria-describedby when errors present), TransientMessage (pause on hover, manual dismiss, aria-live), error boundary (renders message + retry), loading skeleton (renders).
- **Prior art**: `shared/task/task.test.ts` (pure helpers), existing component tests in `components/*.test.tsx` and `app/tasks/_components/*.test.tsx`.
- **Lint**: `pnpm lint` must pass with zero errors/warnings after this work.

## Out of Scope

- Dark mode (deferred; light theme only per Spec 04 frontend).
- Internationalization / locale switching (deferred).
- Keyboard-driven drag-and-drop (deferred; pointer-only DnD is defined by Frontend Spec 09 and is a documented WCAG 2.2 AA gap; status changes remain available via the edit form).
- Comprehensive E2E tests (Playwright not installed).
- Color-contrast automated CI (manual audit documented here).
- Backend changes.

## Further Notes

- Research sources: WCAG 2.2 quick reference (w3.org/WAI/WCAG22/quickref) — principles Perceivable/Operable/Understandable/Robust; success criteria 1.4.1, 1.4.3, 1.4.10, 1.4.11, 2.3.3, 2.4.1, 2.4.2, 2.4.3, 2.4.7, 2.4.11, 2.5.8, 3.2.3, 3.2.4, 3.3.1, 3.3.2, 3.3.3, 4.1.3. Next.js instructions (`.github/instructions/nextjs.instructions.md`) — accessibility, semantic HTML, ARIA, testing. AGENTS.md coding standards.
- Lint failures found during "run current code": `app/tasks/[id]/edit/page.tsx` (JSX in try/catch), `components/TransientMessage.tsx` (ref access during render), `server/prefetch.tsx` (unused `createQueryClient`). These are folded into this spec's lint cleanup.
- The transient message pause-on-hover and manual dismiss are the WCAG 2.2.1 (Timing Adjustable) mitigation; full "adjustable timing" (user-set duration) is deferred.
- This spec supersedes the accessibility-related gaps in Specs 01–03 frontend and Spec 04 frontend (UI foundation) where they conflict.

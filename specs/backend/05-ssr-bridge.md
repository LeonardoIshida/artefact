# Spec: SSR Bridge — Server-Side Prefetch and Hydration

Status: ready-for-agent
Scope: Backend item 5 — server-side prefetch helper, hydration/dehydration of the React Query cache, and error handling for SSR pages.
Depends on: Spec 01 (Task domain — entity, error taxonomy); Spec 02 (Repository — TaskRepository interface); Spec 03 (tRPC infrastructure — client factory, createCaller, React Query defaults); Spec 04 (Task procedures — procedure signatures and error mapping).
Sources: Grilling session (item 5, rounds 1–2); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Artefact's list, detail, and edit pages need their data pre-loaded on the server so users see content immediately instead of a loading spinner. Without a shared prefetch-and-hydrate pattern, each page would reinvent server-side data fetching, risk duplicating requests, and lose the React Query cache benefits (invalidation, refetching) that the client-side mutations rely on. Additionally, a failed prefetch (e.g., a missing task on a detail page) needs to produce the right user-facing response — a 404 for a nonexistent resource, not a crash or a blank page.

## Solution

A reusable SSR bridge: server components await typed query fetches through shared prefetch helpers to load data into the React Query cache before rendering, then wrap children in a `HydrateClient` boundary that dehydrates the cache to the client. The client's query hooks find the data already in cache (no loading flash). Errors during prefetch are caught: `NOT_FOUND` triggers Next.js `notFound()` (404 page), while other errors render inline feedback. All three content pages (list, detail, edit) use this pattern.

## User Stories

1. As an app user, I want the task list to load instantly on first visit (no loading spinner), so that I see my tasks immediately.
2. As an app user, I want the task detail page to show the task's title and description immediately, so that I don't wait for a client-side fetch.
3. As an app user, I want the edit page to pre-load the task being edited, so that the form is populated on first render.
4. As an app user, I want a clear 404 page when I navigate to a task that doesn't exist, so that I know the task is gone.
5. As an app user, I want an error banner (not a crash) when something goes wrong during page load, so that the app stays usable.
6. As an app user, I want the page to feel fast — data is already in the React Query cache after SSR, so mutations and refetches work normally without a second fetch.
7. As a frontend developer, I want a reusable prefetch helper and HydrateClient wrapper, so that each page is ~5 lines and follows one pattern.
8. As a frontend developer, I want the client's query state to find SSR-prefetched data in cache automatically, so that there's no loading flash and no double fetch.
9. As a developer, I want SSR to await its initial query data rather than render unresolved queries, so that the initial HTML contains the rendered content.
10. As a developer, I want the SSR bridge to be testable without HTTP — verify the prefetch uses the appropriate query operation, the boundary dehydrates, and error handling branches correctly.
11. As a developer, I want the hydrated data to use the same stale time as client-fetched data (30s), so that cache behavior is consistent.
12. As a developer, I want the SSR bridge to handle both `NOT_FOUND` (→ `notFound()`) and other errors (→ inline banner) distinctly, so that users get the right response for each failure mode.

## Implementation Decisions

- **Prefetch mechanism**: await the typed query operation before rendering. Use the operation that matches the query shape; the paginated list's first pages are defined in Frontend Spec 08. Fire-and-forget prefetching is not used for initial page data because the HTML must include resolved content.
- **Hydration pattern**: `dehydrate`/`HydrationBoundary` — the standard tRPC + React Query pattern. Server dehydrates the cache; client hydrates it automatically. The hydrated data lives in the React Query cache, so mutations can invalidate and refetches work normally. Passing page data as arbitrary component props does not seed that cache; React Query's `initialData` option does seed it, but infinite-query initial data must use the `pages`/`pageParams` shape in Frontend Spec 08.
- **Reusable helpers**: shared prefetch helpers use the query client's typed fetch operation; `HydrateClient` wraps children with `HydrationBoundary`. Keeps page components small and follows the documented tRPC SSR pattern.
- **Error handling during SSR**: catch + inline feedback (not throw). For the list page, fetch status pages independently and preserve successful lanes; a failed lane receives the lane-local error and Retry behavior defined by Frontend Spec 08. For detail/edit pages, `NOT_FOUND` triggers `notFound()` (correct 404 HTTP semantics), and other errors render an inline banner. The `error.tsx` boundary remains as fallback for unexpected errors.
- **Which pages get SSR**: list, detail, and edit — all content pages. The list preloads the first page for each status lane (Backend Spec 07 and Frontend Spec 08); detail and edit preload the single task being viewed/edited. The former full-list preload is superseded.
- **Client query hook**: detail/edit use `useQuery` (not `useSuspenseQuery`). The paginated list's per-lane cache shape and continuation hook are defined by Frontend Spec 08; its initial pages must be hydrated without a loading flash.
- **Stale time for hydrated data**: same as client default (30s) — consistency; hydrated data is just the initial cache state. No `shouldDehydrateQuery` extension needed (not using streaming/pending queries).
- **No data transformer**: ISO strings only (settled in Spec 01) — no `serializeData`/`deserializeData` needed.
- **Error feedback**: detail/edit SSR failures use an inline banner; list-page failures are lane-local as specified in Frontend Spec 08. `error.tsx` remains the fallback for unexpected errors.
- **Server caller**: the `createCaller` from Spec 03 is available for non-hydration use cases (e.g., generating metadata, server-side logic) but is not used for the SSR bridge — the hydration pattern uses the typed query client.
- **Decoupled layering**: the prefetch helpers live in `server/` (SSR wiring); they consume the tRPC client factory (Spec 03) and the React Query defaults. The domain module (`shared/`) is untouched.

## Testing Decisions

- A good test exercises external behavior through the public seam — never internals, never mocks of internal collaborators.
- **Seam**: the prefetch helper and `HydrateClient` wrapper. Tests verify: the prefetch helper loads the correct query data (including the list's lane pages); `HydrateClient` wraps children with `dehydrate`/`HydrationBoundary`; error handling branches correctly (`NOT_FOUND` → `notFound()`, other errors → inline feedback).
- **Prior art**: the tRPC infrastructure spec (item 3) established the client factory and React Query defaults; the repository spec (item 2) established the in-memory adapter as the test double. SSR tests use the real adapter through the interface.
- **TDD**: per the coding standards, built in vertical red-green slices against the confirmed public seam — prefetch helper first, then `HydrateClient`, then error handling branches.

## Out of Scope

- The list/detail/edit page components themselves (frontend items — they consume the helpers).
- Server-side caller for non-hydration use cases (already in Spec 03's infra).
- Optimistic updates (frontend item).
- Streaming/Suspense (deferred; initial query data is resolved before rendering, with list hook details in Frontend Spec 08).
- List pagination and infinite scroll are defined by Backend Spec 07 and Frontend Spec 08; this spec's former exclusion is superseded.

## Further Notes

- Depends on Specs 01–04: the entity shape and error taxonomy (Spec 01); the repository interface and test-double role (Spec 02); the tRPC context, client factory, and React Query defaults (Spec 03); the procedure signatures and error mapping (Spec 04).
- The PT-BR frontend spec requires SSR for the list page ("Utilize Server-Side Rendering (SSR) para pré-carregar a lista de tarefas") and appropriate error feedback ("Exiba mensagens apropriadas em caso de erro durante as operações").
- For the list, `specs/backend/07-task-pagination.md` defines the page contract and `specs/frontend/08-task-infinite-scroll.md` defines which pages SSR loads and how the client continues them.
- The `shouldDehydrateQuery` extension (to include pending queries for streaming) is not needed because the awaited query operation ensures the initial pages are resolved before dehydration.
- The original PT-BR requirements are preserved under `specs/source/`.

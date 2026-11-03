# Spec: Task Infinite Scroll

Status: ready-for-agent
Scope: Frontend — SSR first pages, per-lane incremental loading, and recovery states for the Kanban board.
Depends on: Backend Spec 05 (SSR bridge); Backend Spec 07 (Task pagination); Frontend Spec 01 (feedback primitives); Frontend Spec 05 (Kanban board); Frontend Spec 07 (accessibility and UX).
Sources: User-provided PT-BR grading feedback (“Infinite Scroll: Na página de listagem, implemente uma funcionalidade de carregamento incremental das tarefas conforme o usuário rola a página.”); infinite-scroll grilling session (2026-11-02).

## Problem Statement

The board currently receives the complete task list before rendering. The exam requirement calls for tasks to load incrementally as the user scrolls. Since the board groups tasks into independently scrollable status lanes, a single global page cursor would make one lane's activity load unrelated tasks and would not match the board's interaction model.

## Solution

Keep SSR for the first page of each status lane, then fetch additional pages independently as that lane's sentinel enters view. Each lane also exposes a manual “Load more” fallback. Loading and errors stay local to the lane; a failed later page does not remove cards already shown. Remove task-count badges because the paginated response intentionally has no total count.

## User Stories

1. As a user, I want the first page of every lane rendered by SSR, so the board is useful immediately.
2. As a user, I want scrolling one lane to load only that lane's next tasks, so other lanes remain independent.
3. As a user, I want a manual “Load more” action as well as automatic loading, so I can continue when observation does not trigger or when I prefer explicit control.
4. As a user, I want loading and retry feedback in the affected lane, so a problem in one status does not block the rest of the board.
5. As a user, I want loaded cards to remain visible after a later page fails, so a temporary error does not erase useful content.
6. As a user, I want the board to refresh its lane pages after a successful task mutation, so changed task ordering does not leave duplicates or gaps.

## Implementation Decisions

- **Independent lane data**: use the existing `@trpc/react-query` infinite-query integration with one query per status and `{ status }` as its base input. tRPC manages each page's cursor and direction metadata; `getNextPageParam` returns `page.nextCursor ?? undefined`. Render the accumulated `pages` in server order. Do not fetch the full task collection and slice it in the browser.
- **SSR first pages**: the `/tasks` server page prefetches the first page for all three statuses with a type-safe query-client operation for an infinite query, using the same base input/key as the client. Use an infinite-query prefetch path rather than forcing the existing finite-query helper to accept infinite-query options. Hydrate each query with the infinite-data shape (`pages` and aligned `pageParams`; the first page uses a `null` page parameter). Render without a client loading flash. Do not pass a plain `TaskPage` as infinite-query `initialData`, SSR subsequent pages, or send a full-list payload.
- **Partial initial failure**: load the three SSR pages independently. If one request fails, render the other successful lanes and show an error with Retry in the failed lane. Retrying that lane starts again from its first page; it does not reload the successful lanes.
- **Automatic trigger**: place a sentinel after each lane's loaded cards and use `IntersectionObserver` to request the next page when that sentinel enters the relevant scroll viewport. On desktop, observe within the lane's own scroll container; when lanes are stacked and the page scrolls, observe against the page viewport. While the sentinel remains in range, continue loading sequential pages until it leaves range or `nextCursor` is `null` (this fills short lanes without requiring an initial manual scroll).
- **Request isolation**: allow at most one outstanding page request per lane. Repeated observer notifications must not issue duplicate requests for the same cursor. A request in one lane must not block requests in another.
- **Manual fallback**: show a “Load more” button at the end of a lane whenever `nextCursor` is non-null. Disable it while that lane is loading. It invokes the same next-page request as the observer. Remove both the button and sentinel when the lane is complete.
- **Loading and errors**: show a lane-local loading indicator while its next page is pending. On a later-page error, retain all loaded cards and show a lane-local error with Retry. A normal request failure retries the failed cursor. If the server reports `BAD_REQUEST` for an invalid cursor, discard only that lane's pages and retry from its first page. No lane error replaces the whole board.
- **Empty and complete lanes**: keep the existing “No tasks” empty-state behavior when the first page succeeds with no items; a failed first-page request shows its error instead of the empty state. A successful empty/terminal response has no sentinel or Load more button. Do not show a total or loaded-task count in lane headers.
- **Mutation reset**: after a successful create, update, or delete, discard all three lanes' accumulated pages and reload each lane from its first page. This is required because updates can change the existing `updatedAt` order and move a task between statuses. A failed mutation does not reset the loaded pages.
- **Accessibility**: expose loading and error feedback with accessible status/alert semantics, give each repeated lane action an accessible name that identifies its lane, and keep the manual button keyboard-operable. The sentinel itself is not the only way to request another page.

## Testing Decisions

- **SSR seam**: verify the page requests and renders the first page for all three statuses without sending later pages. Verify one failed initial lane does not prevent the other lanes from rendering and that the failed lane offers Retry.
- **Rendered board seam**: render `TaskList`/the board with the real tRPC procedure and in-memory repository. Stub only `IntersectionObserver` as the browser API boundary. Assert that intersecting a lane's sentinel appends only that lane's next page, repeated visibility fills a short lane sequentially, and the manual button requests the same next page.
- **Recovery**: make a later-page request fail and assert already-loaded cards remain, the error is lane-local, and Retry recovers. Cover invalid-cursor recovery by verifying that only the affected lane restarts at page one.
- **Mutation reset**: verify successful create, update, and delete each discard accumulated pages and reload all three first pages; failed mutations leave the loaded pages intact.
- **Assertions**: exercise visible text, accessible roles, and resulting task order. Do not assert Tailwind classes, observer implementation details, or the cursor's representation.

## Out of Scope

- A single page-wide cursor that pages tasks across statuses.
- Task-count badges or total-count queries.
- Client-side slicing of the full task list, search, or additional filters.
- Virtualization, drag-and-drop, or a new end-of-list summary.
- End-to-end browser tests requiring a new test framework.

## Further Notes

- This spec supersedes the full-list SSR and pagination exclusions in `specs/frontend/02-task-list.md` and `specs/backend/05-ssr-bridge.md`.
- It also supersedes the task-count display and pagination exclusion in `specs/frontend/05-kanban-board-and-details.md`. That board spec remains authoritative for card layout, columns, details, and deletion interactions.
- The backend page, cursor, ordering, and invalid-cursor contract is defined by `specs/backend/07-task-pagination.md`.

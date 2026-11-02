# Spec: tRPC Infrastructure

Status: ready-for-agent
Scope: Backend item 3 — tRPC server init, route handler, client provider, React Query setup, and SSR-ready client factory.
Depends on: Spec 01 (Task domain — error taxonomy, validation contract); Spec 02 (Repository — TaskRepository interface and composition point).
Sources: Grilling session (item 3, rounds 1); original PT-BR requirements preserved under `specs/source/`.

## Problem Statement

Artefact needs a typesafe way for the frontend to call server-side task operations, and for server components to preload data for SSR. Without a shared tRPC setup, each new procedure would reinvent initialization, routing, client wiring, and error handling — and domain errors (like field-level validation failures) would silently lose their structure crossing the network, leaving the UI unable to tell the user which field was wrong.

## Solution

A tRPC infrastructure layer: an `initTRPC` setup with a minimal context carrying the repository, a custom error formatter that preserves field-level validation errors across the wire, an App Router route handler, a client provider (tRPC + React Query) for the browser, and a client factory built from day one to support both client hooks and server-side callers (SSR preload + hydration). Every layer above consumes this infra; procedures (item 4) and the SSR bridge (item 5) are pure consumers.

## User Stories

1. As an app user, I want task operations (list, get, create, update, delete) to be called from the browser with full type safety, so that I get autocomplete and compile-time errors instead of runtime surprises.
2. As an app user, I want to see which specific field failed validation when I submit a task, so that I can fix exactly what's wrong.
3. As an app user, I want the app to feel fast — simultaneous calls batched into one request, cached data reused within a short window — so that navigating between pages is snappy.
4. As an app user, I want the app to retry a failed request a few times before giving up, so that a transient network blip doesn't become a hard error.
5. As an app user, I want fresh data when I return to the tab, so that edits made elsewhere are reflected.
6. As an app user, I want the task list to load instantly on first visit (SSR), so that I don't stare at a loading spinner.
7. As a frontend developer, I want a single `TrpcProvider` wrapping the app root, so that every component has access to tRPC and React Query without per-page wiring.
8. As a frontend developer, I want the tRPC client and server-side caller to share one factory, so that SSR preload and client queries stay consistent.
9. As a developer, I want the repository injected via context, so that procedures never import a concrete adapter and the seam stays clean.
10. As a developer, I want domain errors to cross the wire with their field-level detail intact, so that the UI can render per-field messages without reverse-engineering a string.
11. As a developer, I want the infrastructure to be testable without HTTP — a server-side caller and a context factory — so that procedures and error formatting are verified in-process.
12. As a developer, I want the React Query cache configured with sensible defaults (stale time, retry with backoff, refetch-on-focus), so that I don't tune per-query.

## Implementation Decisions

- **tRPC version**: v11 (current, verified against the bundled docs). No data transformer — ISO strings end-to-end (settled in item 1); superjson is not used.
- **Context shape**: `{ repository: TaskRepository }` only. Minimal; a typed slot for auth is added when that item lands. No request headers, no session, no pre-built caller in the context.
- **Composition point**: a dedicated accessor module (`getTaskRepository()`) is the single seam — the repository singleton is created there. Procedures, the SSR caller, and tests all consume the interface through this accessor. Swapping the adapter later is a one-line change in one file.
- **Error formatting**: a custom `errorFormatter` in `initTRPC.create()` copies field-level errors from the hand-rolled `ValidationError` into the error's `data` (e.g. `data.fieldErrors: { title: "Title is required" }`). Without it, field details die in `cause` and never reach the client. This is the one place where "how errors cross the wire" is settled.
- **Domain error taxonomy** (from item 1): `TaskNotFound → NOT_FOUND`, `ValidationFailed → BAD_REQUEST`. The formatter ensures `BAD_REQUEST` carries the structured field errors.
- **Route handler**: App Router route at `app/api/trpc/[trpc]/route.ts` using `fetchRequestHandler`. The handler delegates to the router with the context factory; no CORS or custom headers (same-origin only).
- **Client provider**: a dedicated `TrpcProvider` client component wrapping children in the root layout — keeps the layout clean and marks the client boundary.
- **Client factory**: built to support both client usage (React hooks via `createTRPCReact`) and server-side usage (`createCaller` + hydration/dehydration for SSR). Item 5 (SSR bridge) is pure consumption of this factory, not construction.
- **React Query defaults**: `staleTime: 30s`, `retry: 3` with exponential backoff, `refetchOnWindowFocus: true`.
- **Batching**: `httpBatchLink` — combines simultaneous calls into one request; no downside for this app.
- **Strict contracts**: the infra layer is strictly typed; no `any`. The context, procedures, and client are all typed from the router definition.
- **Zero-library domain validation**: no zod anywhere in the infra layer; the custom validator functions from the domain module are plugged into `.input()` at the procedure boundary (item 4).

## Testing Decisions

- A good test exercises external behavior through the public seam — never internals, never mocks of internal collaborators.
- **Seam**: the `createCaller` (server-side caller) and the context factory. Tests verify: context factory returns the repository; error formatter surfaces field-level errors on the client; route handler responds correctly to a request; client factory supports both client and server usage.
- **Prior art**: the repository spec (item 2) established the in-memory adapter as the test double — infra tests use it through the interface, no mocking library.
- **TDD**: per the coding standards, built in vertical red-green slices against the confirmed public seam — context factory first, then error formatting, then route handler, then client factory.

## Out of Scope

- The procedures themselves (item 4): `tasks.list`, `tasks.get`, `tasks.create`, `tasks.update`, `tasks.delete`.
- The SSR prefetch helper for the list page (item 5).
- The error-shape contract for UI rendering (item 6).
- Auth, CORS, subscriptions, WebSockets.

## Further Notes

- The original PT-BR requirements are preserved under `specs/source/`.
- The coding standards (AGENTS.md) now include TDD, deep modules, strict contracts, and zero-library domain validation — this spec's testing approach follows them.
- Error formatting is the one subtle piece: tRPC's default error shape omits `cause` from the wire, so a custom `errorFormatter` is required to deliver field-level errors to the client. Getting this right is exam-relevant.
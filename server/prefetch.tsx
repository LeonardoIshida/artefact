import { dehydrate, HydrationBoundary, type QueryClient } from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createQueryClient } from "../lib/query-client";

export { createQueryClient } from "../lib/query-client";

/**
 * Creates a fresh React Query client for a single SSR request, using the
 * shared defaults (staleTime 30s, retry 3 w/ backoff, refetchOnWindowFocus).
 */
export function getQueryClient(): QueryClient {
  return createQueryClient();
}

/**
 * Awaits `fetchQuery` so the initial HTML contains the fully rendered data
 * (no loading flash) and the result lands in the React Query cache.
 */
export async function prefetch<TData = unknown>(
  queryClient: QueryClient,
  options: Parameters<QueryClient["fetchQuery"]>[0],
): Promise<TData> {
  return queryClient.fetchQuery(options) as Promise<TData>;
}

/**
 * Wraps children in a `HydrationBoundary` so the dehydrated cache is handed
 * to the client and `useQuery` finds the prefetched data without re-fetching.
 */
export function HydrateClient({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}

/**
 * Returns true when an error is a tRPC `NOT_FOUND` (e.g. a missing task).
 * Pages use this to call `notFound()` during SSR instead of rendering a
 * generic error.
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof TRPCError && error.code === "NOT_FOUND";
}

/**
 * Convenience for SSR pages: prefetches `options`; on `NOT_FOUND` triggers
 * Next.js' 404 response, on any other error re-throws so the page can render
 * an inline banner (or the error boundary can catch it).
 */
export async function prefetchOrNotFound(
  queryClient: QueryClient,
  options: Parameters<QueryClient["fetchQuery"]>[0],
): Promise<void> {
  try {
    await prefetch(queryClient, options);
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }
    throw error;
  }
}

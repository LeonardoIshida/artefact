import { QueryClient } from "@tanstack/react-query";

// Sensible defaults shared by client and server QueryClients (Spec 03).
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
      },
    },
  });
}

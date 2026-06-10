"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * QueryProvider
 *
 * Wraps the admin panel with TanStack Query's QueryClientProvider.
 * Client-level QueryClient is created via useState so each browser session
 * gets its own isolated cache (important for SSR correctness).
 *
 * Enterprise defaults:
 *  - staleTime:           30s  — data considered fresh for 30 seconds
 *  - gcTime:              5min — keep in memory 5 min after last subscriber unmounts
 *  - refetchOnWindowFocus: true — refresh when user returns to the tab
 *  - refetchOnReconnect:   true — refresh when internet reconnects
 *  - retry:               2    — 2 automatic retries on network error
 *  - retryDelay:          exponential backoff capped at 30s
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 2,
            retryDelay: (attemptIndex) =>
              Math.min(1_000 * 2 ** attemptIndex, 30_000),
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default QueryProvider;

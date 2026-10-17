import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, type RenderHookOptions, type RenderOptions } from "@testing-library/react";

/** A QueryClient with retries disabled so failures surface immediately in tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function wrapperWith(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient } = {},
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;
  return {
    queryClient,
    ...render(ui, { wrapper: wrapperWith(queryClient), ...renderOptions }),
  };
}

export function renderHookWithProviders<Result, Props>(
  hook: (initialProps: Props) => Result,
  options: Omit<RenderHookOptions<Props>, "wrapper"> & { queryClient?: QueryClient } = {},
) {
  const { queryClient = createTestQueryClient(), ...hookOptions } = options;
  return {
    queryClient,
    ...renderHook(hook, { wrapper: wrapperWith(queryClient), ...hookOptions }),
  };
}

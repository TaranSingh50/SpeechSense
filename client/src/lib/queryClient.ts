import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Don't set Content-Type for FormData - let browser set it with boundary
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add authorization header if token exists (except for auth endpoints)
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken && !url.includes("/api/auth/")) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const headers: Record<string, string> = {};

    // Add authorization header if token exists (except for auth endpoints)
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken && !url.includes("/api/auth/")) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always consider data stale for immediate updates
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      refetchOnMount: true,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

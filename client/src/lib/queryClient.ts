import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get the base URL for API calls
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, use Supabase Edge Functions
    return 'https://orgjlvvrirnpszenxjha.supabase.co/functions/v1/pokemon-game';
  }
  // In development, use local backend on port 3000
  return 'http://localhost:3000';
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { timeout?: number }
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  // For Supabase Edge Functions, remove /api prefix since the function handles both
  const cleanUrl = url.startsWith('/api/') ? url.substring(4) : url;
  const fullUrl = baseUrl ? `${baseUrl}${cleanUrl}` : url;
  
  // Get JWT token from localStorage
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('API Request with JWT:', { method, url: fullUrl, hasToken: true });
  } else {
    console.log('API Request without JWT:', { method, url: fullUrl, hasToken: false });
  }
  
  // Special logging for refund requests
  if (url.includes('/vault/refund-async')) {
    console.log('REFUND ASYNC REQUEST:', { method, url: fullUrl, data, headers });
  }
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = options?.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiBaseUrl();
    // Fix double slash issue by properly joining URL parts
    const path = queryKey.join("/").replace(/^\/+/, ""); // Remove leading slashes
    // For Supabase Edge Functions, remove /api prefix
    const cleanPath = path.startsWith('api/') ? path.substring(4) : path;
    const fullUrl = baseUrl ? `${baseUrl}/${cleanPath}` : `/${path}`;
    
    // Get JWT token from localStorage
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Query with JWT:', { url: fullUrl, hasToken: true });
    } else {
      console.log('Query without JWT:', { url: fullUrl, hasToken: false });
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

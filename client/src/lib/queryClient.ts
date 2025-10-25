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
    // In production, use the same domain as the frontend (no CORS issues)
    return '';
  }
  // In development, use relative URLs (Vite proxy will handle routing to backend)
  return '';
};

// Special function for auth requests using same domain
export async function authRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { timeout?: number }
): Promise<Response> {
  // Use base URL for auth requests
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = options?.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "omit",
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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { timeout?: number }
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  // For Vercel serverless functions, use full URL with /api prefix
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;
  
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
      credentials: "omit", // Temporarily disable credentials to allow wildcard CORS
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
// Special query function for auth endpoints using same domain
export const getAuthQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use base URL for auth queries
    const baseUrl = getApiBaseUrl();
    const path = queryKey.join("/").replace(/^\/+/, ""); // Remove leading slashes
    const fullUrl = baseUrl ? `${baseUrl}/${path}` : `/${path}`;
    
    // Get JWT token from localStorage
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Auth Query with JWT:', { url: fullUrl, hasToken: true });
    } else {
      console.log('Auth Query without JWT:', { url: fullUrl, hasToken: false });
    }
    
    const res = await fetch(fullUrl, {
      credentials: "omit",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      // For auth endpoints, treat 401 as null instead of error
      if (res.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
      // For 404 errors, also return null instead of throwing (common on first load)
      if (res.status === 404) {
        console.warn(`Auth endpoint not found: ${fullUrl}`);
        return null;
      }
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  };

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiBaseUrl();
    // Fix double slash issue by properly joining URL parts
    const path = queryKey.join("/").replace(/^\/+/, ""); // Remove leading slashes
    const fullUrl = baseUrl ? `${baseUrl}/${path}` : `/${path}`;
    
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
      credentials: "omit", // Temporarily disable credentials to allow wildcard CORS
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      // For 404 errors, return null instead of throwing (common on first load)
      if (res.status === 404) {
        console.warn(`API endpoint not found: ${fullUrl}`);
        return null;
      }
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

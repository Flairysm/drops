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
    // In production, use Railway backend
    return 'https://drops-backend-production-b145.up.railway.app';
  }
  // In development, use local backend
  return '';
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl + url;
  
  // Get JWT token from localStorage
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('🔐 API Response:', { status: res.status, cookies: res.headers.get('set-cookie') });

  await throwIfResNotOk(res);
  return res;
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
    const fullUrl = `${baseUrl}/${path}`;
    
    // Get JWT token from localStorage
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('🔒 401 Unauthorized - returning null');
      return null;
    }

    if (!res.ok) {
      console.log('❌ Response not ok:', res.status, res.statusText);
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log('✅ Response data:', data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      gcTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

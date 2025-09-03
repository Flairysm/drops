import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });

  // If we get a 401, we're not authenticated, so stop loading
  const isActuallyLoading = isLoading && !error;
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading: isActuallyLoading,
    isAuthenticated,
    isAdmin: !!user && (user as any).role === 'admin',
  };
}

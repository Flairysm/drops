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

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isAdmin: !!user && (user as any).role === 'admin',
  };
}

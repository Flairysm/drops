import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Changed back to true to ensure user data is fetched
    refetchOnReconnect: false,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // If we get a 401 or any error, we're not authenticated, so stop loading
  const isActuallyLoading = isLoading && !error && !user;
  const isAuthenticated = !!user && !error;

  // Function to manually refresh user data
  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  // Debug logging
  console.log('useAuth state:', { user, isLoading, error, isAuthenticated });

  return {
    user,
    isLoading: isActuallyLoading,
    isAuthenticated,
    isAdmin: !!user && (user as any).role === 'admin',
    refreshUser,
  };
}

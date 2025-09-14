import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface User {
  id: string;
  username?: string;
  email?: string;
  credits: string;
  totalSpent: string;
  isBanned: boolean;
  isSuspended: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useUserData() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-data'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user data');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(isLoading);
  }, [userData, isLoading]);

  return {
    user,
    isAuthenticated,
    loading,
  };
}

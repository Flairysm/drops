import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useSupabaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    // For development, skip Supabase auth and set loading to false immediately
    console.log('🔍 useSupabaseAuth: Skipping auth for development');
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
  };
};
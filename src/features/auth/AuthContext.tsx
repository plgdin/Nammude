import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Database } from '@/types/database.types';
import { SEED_USERS, SeedUserFixture } from '@/mocks/auth.fixtures';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMockMode: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithMockUser: (mockUser: SeedUserFixture) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(env.isMockAuthEnabled || !env.isConfigured);

  // Fetch or sync public profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.warn('[Auth] Failed to load user profile:', profileErr.message);
        return;
      }
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.warn('[Auth] Unexpected error loading profile:', err);
    }
  }, []);

  // Initialize Auth
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      setIsLoading(true);

      // Check live Supabase session if configured and mock auth is not forced
      if (env.isConfigured && !env.isMockAuthEnabled) {
        try {
          const { data: { session: currentSession }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) throw sessionErr;

          if (isMounted && currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            setIsMockMode(false);
            await fetchProfile(currentSession.user.id);
          }
        } catch (err) {
          console.warn('[Auth] Live session check error:', err);
        }
      } else if (env.isMockAuthEnabled) {
        // Fallback to initial seed user (Sarah - Harbor Café Owner) for immediate developer evaluation
        const initialSeed = SEED_USERS[0];
        if (isMounted) {
          setUser({
            id: initialSeed.id,
            email: initialSeed.email,
            app_metadata: {},
            user_metadata: { full_name: initialSeed.fullName },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as User);
          setProfile({
            id: initialSeed.id,
            email: initialSeed.email,
            full_name: initialSeed.fullName,
            avatar_url: null,
            phone: null,
            is_platform_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setIsMockMode(true);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes if live configured
    if (env.isConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user || null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [fetchProfile]);

  // Sign In with email & password
  const signInWithPassword = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    if (env.isConfigured) {
      try {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authErr) {
          setError(authErr.message);
          setIsLoading(false);
          return { success: false, error: authErr.message };
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          setIsMockMode(false);
          await fetchProfile(data.user.id);
        }

        setIsLoading(false);
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        setIsLoading(false);
        return { success: false, error: message };
      }
    }

    // Mock Mode fallback
    if (env.isMockAuthEnabled) {
      const matchedUser = SEED_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (matchedUser) {
        signInWithMockUser(matchedUser);
        setIsLoading(false);
        return { success: true };
      }

      const msg = 'Invalid credentials. In development mock mode, use one of the seed accounts.';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }

    const unconfiguredMsg = 'Supabase credentials are not configured in .env. Live authentication unavailable.';
    setError(unconfiguredMsg);
    setIsLoading(false);
    return { success: false, error: unconfiguredMsg };
  };

  // Sign In with Mock Seed User (Dev / Testing)
  const signInWithMockUser = (mockUser: SeedUserFixture) => {
    setUser({
      id: mockUser.id,
      email: mockUser.email,
      app_metadata: {},
      user_metadata: { full_name: mockUser.fullName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User);

    setProfile({
      id: mockUser.id,
      email: mockUser.email,
      full_name: mockUser.fullName,
      avatar_url: null,
      phone: null,
      is_platform_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setIsMockMode(true);
    setError(null);
  };

  // Sign Out
  const signOut = async () => {
    setIsLoading(true);
    if (env.isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setError(null);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: user !== null,
    isMockMode,
    error,
    signInWithPassword,
    signInWithMockUser,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

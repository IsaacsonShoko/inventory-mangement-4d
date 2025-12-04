import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// User role types
export type UserRole = 'admin' | 'back_office' | 'user';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  warehouse: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; company?: string; role?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isBackOffice: boolean;
  isApproved: boolean;
  isPending: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile with aggressive timeout to prevent hanging
  const fetchProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      console.log(`[Auth] fetchProfile called for ${userId}`);

      // Create timeout promise (10 seconds max)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
      });

      // Race between fetch and timeout
      const { data, error } = await Promise.race([
        supabase.from('user_profiles').select('*').eq('id', userId).single(),
        timeoutPromise
      ]);

      if (error) {
        console.error('[Auth] Profile fetch error:', error);

        // If profile not found and this is a new signup, retry once
        if (error.code === 'PGRST116' && retryCount < 1) {
          console.log(`[Auth] Profile not found, retrying in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }

        return null;
      }

      console.log('[Auth] Profile fetched successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('[Auth] Profile fetch failed:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[Auth] Initial auth check starting');
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Session retrieved:', session ? 'User logged in' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('[Auth] Fetching profile for user:', session.user.id);
        const profile = await fetchProfile(session.user.id);
        console.log('[Auth] Profile fetched:', profile ? 'Success' : 'Failed/Null');
        setProfile(profile);
      }

      console.log('[Auth] Setting loading to false');
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session ? 'User present' : 'No user');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('[Auth] Fetching profile after state change');
          const profile = await fetchProfile(session.user.id);
          console.log('[Auth] Profile after state change:', profile ? 'Success' : 'Failed/Null');
          setProfile(profile);
        } else {
          setProfile(null);
        }

        console.log('[Auth] Setting loading to false after state change');
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { first_name?: string; last_name?: string; company?: string; role?: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  // Role checking helpers
  const isAdmin = profile?.role === 'admin';
  const isBackOffice = profile?.role === 'back_office' || profile?.role === 'admin';
  const isApproved = profile?.approval_status === 'approved';
  const isPending = profile?.approval_status === 'pending';

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin,
    isBackOffice,
    isApproved,
    isPending,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protecting routes
export function useRequireAuth(requiredRoles?: UserRole[]) {
  const { user, profile, loading, hasRole } = useAuth();

  const isAuthorized = !requiredRoles || hasRole(requiredRoles);

  return {
    isLoading: loading,
    isAuthenticated: !!user,
    isAuthorized,
    user,
    profile,
  };
}

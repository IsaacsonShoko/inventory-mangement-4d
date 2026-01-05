import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

// User role types
export type UserRole = 'admin' | 'back_office' | 'user' | 'guest';
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
  is_guest: boolean | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; company?: string; role?: string }) => Promise<{ error: Error | null }>;
  signInAsGuest: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isBackOffice: boolean;
  isApproved: boolean;
  isPending: boolean;
  isGuest: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get profile from local storage
  const getStoredProfile = (userId: string): UserProfile | null => {
    try {
      const stored = localStorage.getItem(`user_profile_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading profile from local storage', e);
    }
    return null;
  };

  // Helper to save profile to local storage
  const saveProfileToStorage = (userId: string, profile: UserProfile) => {
    try {
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving profile to local storage', e);
    }
  };

  // Fetch user profile with aggressive timeout to prevent hanging
  const fetchProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    try {
      console.log(`[Auth] fetchProfile called for ${userId} (attempt ${retryCount + 1})`);

      // Try to get from cache first if this is the first attempt
      if (retryCount === 0) {
        const cachedProfile = getStoredProfile(userId);
        if (cachedProfile) {
          console.log('[Auth] Found cached profile, using it temporarily');
          // Don't return immediately, let the network request proceed in background if needed
          // But for now, we return it to unblock UI, and we can update it later
        }
      }

      // Create timeout promise (30 seconds max) - increased from 15s
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 30000);
      });

      // Race between fetch and timeout
      const { data, error } = await Promise.race([
        supabase.from('user_profiles').select('*').eq('id', userId).single(),
        timeoutPromise
      ]);

      if (error) {
        console.error('[Auth] Profile fetch error:', error);

        // If we have a cached profile and network fails, use cached
        const cachedProfile = getStoredProfile(userId);
        if (cachedProfile) {
            console.log('[Auth] Network fetch failed, falling back to cached profile');
            return cachedProfile;
        }

        // Retry on timeout or network error, or if profile not found (up to 3 times)
        if (retryCount < 3) {
          console.log(`[Auth] Retrying profile fetch in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return fetchProfile(userId, retryCount + 1);
        }

        return null;
      }

      console.log('[Auth] Profile fetched successfully');
      const fetchedProfile = data as UserProfile;
      saveProfileToStorage(userId, fetchedProfile);
      return fetchedProfile;
    } catch (error) {
      console.error('[Auth] Profile fetch failed:', error);
      
      // If we have a cached profile and network fails, use cached
      const cachedProfile = getStoredProfile(userId);
      if (cachedProfile) {
          console.log('[Auth] Network fetch failed (exception), falling back to cached profile');
          return cachedProfile;
      }

      // Also retry on caught errors (like timeout)
      if (retryCount < 3) {
        console.log(`[Auth] Caught error, retrying profile fetch in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchProfile(userId, retryCount + 1);
      }
      
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
        
        // OPTIMISTIC UPDATE: Check cache immediately
        const cachedProfile = getStoredProfile(session.user.id);
        if (cachedProfile) {
            console.log('[Auth] Loaded profile from cache immediately');
            setProfile(cachedProfile);
            setLoading(false); // Unblock UI immediately
        }

        // Fetch fresh data in background
        fetchProfile(session.user.id).then(freshProfile => {
            if (freshProfile) {
                console.log('[Auth] Background profile refresh success');
                setProfile(freshProfile);
            } else {
                 console.log('[Auth] Background profile refresh failed, keeping cached if available');
            }
            // If we didn't have cache, we need to set loading false here
            if (!cachedProfile) setLoading(false);
        });
      } else {
          console.log('[Auth] Setting loading to false (no user)');
          setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event, session ? 'User present' : 'No user');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('[Auth] Fetching profile after state change');
          
           // OPTIMISTIC UPDATE: Check cache immediately
           const cachedProfile = getStoredProfile(session.user.id);
           if (cachedProfile) {
               console.log('[Auth] Loaded profile from cache (state change)');
               setProfile(cachedProfile);
               setLoading(false);
           }

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

  const signInAsGuest = async () => {
    try {
      setLoading(true);

      const envEmail = import.meta.env.VITE_GUEST_EMAIL;
      const envPassword = import.meta.env.VITE_GUEST_PASSWORD;
      
      console.log('Guest login attempt:', { 
        emailConfigured: !!envEmail, 
        passwordConfigured: !!envPassword 
      });

      if (!envEmail || !envPassword) {
        const localGuestProfile: UserProfile = {
          id: 'local-guest',
          email: 'guest@local',
          full_name: 'Guest User',
          first_name: 'Guest',
          last_name: 'User',
          company: '4D Analytics',
          role: 'guest',
          approval_status: 'approved',
          approved_by: null,
          approved_at: null,
          warehouse: null,
          is_guest: true,
        };
        setProfile(localGuestProfile);
        saveProfileToStorage(localGuestProfile.id, localGuestProfile);
        toast.success('Guest mode enabled (local). Read-only access granted.');
        return { data: null, error: null };
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: envEmail,
        password: envPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: envEmail,
            password: envPassword,
            options: {
              data: {
                first_name: 'Recruiter',
                last_name: 'Guest',
                company: '4D Analytics',
                full_name: 'Recruiter Guest'
              }
            }
          });

          if (signUpError) throw signUpError;

          if (signUpData.session) {
             toast.success('Guest access initialized. Welcome!');
             return { data: signUpData, error: null };
          }
        }
        throw signInError;
      }

      toast.success('Welcome! Exploring as guest user - Try the AI Assistant to see RAG capabilities');
      return { data: signInData, error: null };
    } catch (error: any) {
      console.error('Guest login error:', error);
      toast.error('Failed to create guest session');
      return { data: null, error };
    } finally {
      setLoading(false);
    }
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
  const isGuest = (profile?.is_guest === true) || (profile?.email === import.meta.env.VITE_GUEST_EMAIL);

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
    signInAsGuest,
    signOut,
    resetPassword,
    updatePassword,
    isAdmin,
    isBackOffice,
    isApproved,
    isPending,
    isGuest,
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

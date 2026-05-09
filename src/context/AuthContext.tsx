import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getAppUrl } from '../lib/appUrl';

export interface UsageLimits {
  ai_messages: { used: number; limit: number | null; limit_reached: boolean };
  prayers: { used: number; limit: number | null; limit_reached: boolean };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionTier: 'free' | 'pro';
  isPro: boolean;
  profileCompleted: boolean;
  limits: UsageLimits | null;
  refreshLimits: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro'>('free');
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [limits, setLimits] = useState<UsageLimits | null>(null);

  const isPro = subscriptionTier === 'pro';

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, profile_completed')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      const tier = data?.subscription_tier === 'pro' ? 'pro' : 'free';
      setSubscriptionTier(tier);
      setProfileCompleted(Boolean(data?.profile_completed));
      return tier;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setSubscriptionTier('free');
      setProfileCompleted(false);
      return 'free' as const;
    }
  }, []);

  const refreshLimits = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/check-limits`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLimits(data);
        setSubscriptionTier(data.tier === 'pro' ? 'pro' : 'free');
      }
    } catch (err) {
      console.error('Failed to fetch limits:', err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setSubscriptionTier('free');
        setProfileCompleted(false);
        setLimits(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (user && session) {
      refreshLimits();
    }
  }, [user?.id, session?.access_token, refreshLimits]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const emailRedirectTo = `${getAppUrl()}/email-confirmed`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscriptionTier('free');
    setProfileCompleted(false);
    setLimits(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscriptionTier,
        isPro,
        profileCompleted,
        limits,
        refreshLimits,
        signUp,
        signIn,
        signOut,
      }}
    >
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

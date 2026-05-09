import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getAppUrl } from '../lib/appUrl';

export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_yearly';

export interface UsageLimits {
  ai_messages: { used: number; limit: number | null; limit_reached: boolean };
  prayers: { used: number; limit: number | null; limit_reached: boolean };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionTier: SubscriptionTier;
  isPro: boolean;
  profileCompleted: boolean;
  limits: UsageLimits | null;
  refreshLimits: () => Promise<void>;
  refreshProfile: () => Promise<SubscriptionTier>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Normalise whatever is stored in DB → our canonical SubscriptionTier */
function normaliseTier(raw: string | null | undefined): SubscriptionTier {
  if (raw === 'pro_monthly') return 'pro_monthly';
  if (raw === 'pro_yearly') return 'pro_yearly';
  // Legacy: the old code wrote "pro" without a period suffix
  if (raw === 'pro') return 'pro_monthly';
  return 'free';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [limits, setLimits] = useState<UsageLimits | null>(null);

  // isPro is true for any paid tier
  const isPro = subscriptionTier === 'pro_monthly' || subscriptionTier === 'pro_yearly';

  const fetchProfile = useCallback(async (userId: string): Promise<SubscriptionTier> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, profile_completed')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      const tier = normaliseTier(data?.subscription_tier);
      setSubscriptionTier(tier);
      setProfileCompleted(Boolean(data?.profile_completed));
      return tier;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setSubscriptionTier('free');
      setProfileCompleted(false);
      return 'free';
    }
  }, []);

  /** Exposed so pages like UpgradeSuccess can force-refresh after payment */
  const refreshProfile = useCallback(async (): Promise<SubscriptionTier> => {
    if (!user) return 'free';
    return await fetchProfile(user.id);
  }, [user, fetchProfile]);

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
        // check-limits also returns tier — keep in sync
        if (data.tier) {
          setSubscriptionTier(normaliseTier(data.tier));
        }
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
        refreshProfile,
        signUp,
        signIn,
        signOut,
        isEmailVerified: !!user?.email_confirmed_at,
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

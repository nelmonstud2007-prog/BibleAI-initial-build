import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When true (default), the user must have completed their profile.
   * Set false for the /complete-profile route itself.
   */
  requireProfileComplete?: boolean;
}

/**
 * ProtectedRoute guards dashboard-level routes.
 * It does NOT globally redirect logged-in users away from public pages
 * (/, /landing, /pricing, etc.) — those routes never use this component.
 */
export default function ProtectedRoute({
  children,
  requireProfileComplete = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(requireProfileComplete);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    if (!requireProfileComplete || !user) {
      setProfileLoading(false);
      return;
    }

    const fetchProfileCompletion = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', user.id)
        .maybeSingle();
      setProfileCompleted(Boolean(data?.profile_completed));
      setProfileLoading(false);
    };

    void fetchProfileCompletion();
  }, [requireProfileComplete, user?.id]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → send to sign-in
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Logged in but profile incomplete → complete-profile wizard
  if (requireProfileComplete && !profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}

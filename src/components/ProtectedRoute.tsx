import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({
  children,
  requireProfileComplete = true,
}: {
  children: React.ReactNode;
  requireProfileComplete?: boolean;
}) {
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

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (requireProfileComplete && !profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}

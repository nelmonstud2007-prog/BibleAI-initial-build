import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Exchange tokens from URL hash (PKCE flow)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          // Try to get session from URL hash
          const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
          const accessToken = hashParams.get('access_token');
          if (!accessToken) {
            setChecking(false);
            setShowButton(true);
            return;
          }
        }

        const userId = session?.user?.id;
        if (!userId) {
          setChecking(false);
          setShowButton(true);
          return;
        }

        // Check if profile is completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_completed')
          .eq('id', userId)
          .maybeSingle();

        if (!profile?.profile_completed) {
          navigate('/complete-profile', { replace: true });
        } else {
          setChecking(false);
          setShowButton(true);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
        setChecking(false);
        setShowButton(true);
      }
    };

    handleConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[420px] bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-navy-900/60 border border-navy-800 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-black/40">
        <div className="relative w-24 h-24 mx-auto mb-7">
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <span className="absolute inset-2 rounded-full bg-emerald-400/20 animate-pulse" />
          <div className="relative w-full h-full rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white">Email Confirmed! 🙏</h1>
        <p className="mt-3 text-navy-300 text-base">
          Welcome to BibleAI. Your account is ready.
        </p>

        {checking ? (
          <div className="mt-8 inline-flex items-center gap-2 text-navy-300">
            <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
            <span>Setting up your account...</span>
          </div>
        ) : showButton ? (
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="mt-8 inline-flex items-center justify-center bg-gold-400 text-navy-950 font-semibold px-8 py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-gold-400/20"
          >
            Go to Dashboard
          </button>
        ) : null}
      </div>
    </div>
  );
}

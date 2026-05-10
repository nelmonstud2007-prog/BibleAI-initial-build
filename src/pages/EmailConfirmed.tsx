import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if profile is already completed (e.g. Google user or already filled)
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_completed')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profile?.profile_completed) {
          navigate('/dashboard');
        } else {
          setLoading(false);
        }
      } else {
        // No session, wait a bit for Supabase to process the hash/token
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setLoading(false);
          } else {
            navigate('/signin');
          }
        }, 2000);
      }
    };
    checkSession();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
         <div className="w-16 h-16 bg-gold-400/10 rounded-2xl flex items-center justify-center animate-pulse border border-gold-400/20 mb-6">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
         </div>
         <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.4em] animate-pulse">Verifying Access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6 relative overflow-hidden">
      
      {/* Cinematic Background */}
      <div className="absolute top-0 inset-x-0 h-96 bg-emerald-400/5 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 sm:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] text-center space-y-10">
          
          <div className="relative inline-flex items-center justify-center">
             <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full" />
             <div className="relative w-20 h-20 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-400/30 transform hover:scale-110 transition-transform duration-500">
                <CheckCircle2 className="w-10 h-10 text-navy-950" />
             </div>
          </div>

          <div className="space-y-4">
             <h1 className="text-3xl font-bold text-white tracking-tight">Verified</h1>
             <p className="text-navy-400 text-sm leading-relaxed max-w-xs mx-auto">
                Your account is active. We've prepared everything for your journey.
             </p>
          </div>

          <button
            onClick={() => navigate('/complete-profile')}
            className="group w-full bg-gold-gradient text-navy-950 font-black py-5 rounded-2xl shadow-2xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-sm uppercase tracking-widest"
          >
            Continue
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Cross, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setLoading(false);
      } else {
        // If no session, wait a bit then redirect to signin
        setTimeout(() => navigate('/signin'), 3000);
      }
    };
    checkSession();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 mesh-gradient">
         <div className="w-16 h-16 bg-gold-400/10 rounded-2xl flex items-center justify-center animate-pulse border border-gold-400/20 mb-6">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
         </div>
         <p className="text-[10px] font-black text-gold-400 uppercase tracking-[0.4em] animate-pulse">Confirming Presence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 relative overflow-hidden mesh-gradient">
      
      {/* Celebration Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-96 bg-emerald-400/5 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-lg relative group">
        <div className="absolute -inset-1 bg-emerald-gradient rounded-[3rem] blur-2xl opacity-10" />
        
        <div className="relative bg-navy-900 border border-white/5 rounded-[3rem] p-12 sm:p-16 shadow-2xl text-center space-y-10">
          
          <div className="relative inline-flex items-center justify-center">
             <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full" />
             <div className="relative w-24 h-24 bg-emerald-400 rounded-[2rem] flex items-center justify-center shadow-xl shadow-emerald-400/30 transform hover:scale-110 transition-transform duration-500">
                <CheckCircle2 className="w-12 h-12 text-navy-950" />
             </div>
          </div>

          <div className="space-y-6">
             <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">Grace Received</h1>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Presence Verified</p>
             </div>
             <p className="text-navy-400 text-lg leading-relaxed max-w-sm mx-auto">
                Your sanctuary access is now fully active. We have prepared a space for your spiritual growth.
             </p>
          </div>

          <div className="pt-6">
             <button
               onClick={() => navigate('/complete-profile')}
               className="group w-full bg-gold-gradient text-navy-950 font-black py-6 rounded-[2rem] shadow-2xl shadow-gold-400/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-sm uppercase tracking-widest"
             >
               Enter the Sanctuary
               <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 opacity-40">
             <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                   <Cross className="w-4 h-4 text-white" />
                </div>
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Faith First</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                   <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Growth Focused</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, Cross, ShieldCheck, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/email-confirmed`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      trackEvent('signup_success');
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (googleError) setError(googleError.message);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 mesh-gradient">
        <div className="w-full max-w-md bg-navy-900 border border-white/5 rounded-[2.5rem] p-12 shadow-2xl text-center space-y-8 animate-fade-in">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-400/10 rounded-full border border-emerald-400/20 mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-pulse" />
           </div>
           <div className="space-y-4">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-tight">Verification Envoy Sent</h1>
              <p className="text-navy-400 text-sm leading-relaxed font-medium">We have sent a sacred confirmation link to <span className="text-white font-bold">{email}</span>. Please verify your email to begin your journey.</p>
           </div>
           <button onClick={() => setSuccess(false)} className="text-[10px] font-black text-gold-400 uppercase tracking-[0.2em] hover:text-white transition-colors underline underline-offset-8">Mistyped your email?</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 relative overflow-hidden mesh-gradient">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative group">
        <div className="absolute -inset-1 bg-gold-gradient rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-all duration-700" />
        
        <div className="relative bg-navy-900 border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8">
          
          <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center w-14 h-14 bg-gold-gradient rounded-2xl shadow-xl shadow-gold-400/20 mb-2 transform hover:-rotate-3 transition-transform">
                <Sparkles className="w-7 h-7 text-navy-950" />
             </div>
             <div className="space-y-1">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Create Account</h1>
                <p className="text-navy-400 text-sm font-medium">Join a global community of disciples.</p>
             </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            {error && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-2xl px-5 py-3.5 text-xs text-red-400 font-bold flex items-center gap-2 animate-slide-up-fade">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="Elijah Stone"
                  />
                  <User className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-700" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="you@sanctuary.com"
                  />
                  <Mail className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-700" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Choose Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-700" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-gold-gradient text-navy-950 font-black py-5 rounded-2xl shadow-xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start Journey
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-1">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
             <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em]"><span className="bg-navy-900 px-4 text-navy-600">Or Divine Access</span></div>
          </div>

          <button
            onClick={handleGoogleSignUp}
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>

          <p className="text-center text-[10px] font-black text-navy-600 uppercase tracking-widest">
            Already a member?{' '}
            <Link to="/signin" className="text-gold-400 hover:text-white transition-colors">Enter Sanctuary</Link>
          </p>

          <div className="flex items-center justify-center gap-6 opacity-30 pt-2">
             <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-white" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Privacy Protected</span>
             </div>
             <div className="flex items-center gap-1.5">
                <Cross className="w-3 h-3 text-white" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Grace Integrated</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

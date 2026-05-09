import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, User, CheckCircle2, Cross } from 'lucide-react';
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
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6 relative">
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] text-center space-y-8 animate-fade-in">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-400/10 rounded-3xl border border-emerald-400/20 mb-2 shadow-2xl shadow-emerald-400/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
           </div>
           <div className="space-y-3">
             <h1 className="text-3xl font-bold text-white tracking-tight">Check Your Inbox</h1>
             <p className="text-navy-400 text-sm leading-relaxed">We sent a confirmation link to <span className="text-white font-bold">{email}</span>.</p>
           </div>
           <div className="pt-4">
             <button onClick={() => setSuccess(false)} className="text-[11px] font-black text-gold-400 uppercase tracking-widest hover:text-white transition-colors border-b border-gold-400/30 pb-0.5">Mistyped your email?</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6 relative overflow-hidden">
      
      {/* Cinematic Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-400/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 sm:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] space-y-10">
          
          <div className="text-center space-y-4">
             <Link to="/" className="inline-flex items-center justify-center w-14 h-14 bg-gold-gradient rounded-2xl shadow-2xl shadow-gold-400/20 mb-2 hover:scale-110 transition-transform">
                <Cross className="w-7 h-7 text-navy-950" />
             </Link>
             <h1 className="text-3xl font-bold text-white tracking-tight">Join the Fold</h1>
             <p className="text-navy-400 text-sm font-medium">Start your spiritual habit today.</p>
          </div>

          <button
            onClick={handleGoogleSignUp}
            className="w-full bg-white text-gray-900 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-4 text-sm shadow-xl active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.79 1.97l3.58-3.58C18.16 1.28 15.3 0 12 0 7.31 0 3.25 2.67 1.24 6.56l4.12 3.19C6.33 6.94 8.94 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.56-.19-2.3H12v4.51h6.47c-.28 1.48-1.11 2.73-2.36 3.57l3.66 2.84c2.14-1.97 3.39-4.87 3.39-8.62z" />
              <path fill="#FBBC05" d="M5.36 14.25c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25L1.24 6.56C.45 8.12 0 9.97 0 12s.45 3.88 1.24 5.44l4.12-3.19z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.17-4.3 1.17-3.14 0-5.8-2.12-6.75-4.97l-4.12 3.19C3.25 21.33 7.31 24 12 24z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
             <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-[#0b1224] px-4 text-navy-500">Or use email</span></div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-xs text-red-400 font-bold animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest ml-2">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 focus:bg-white/[0.05] transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest ml-2">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 focus:bg-white/[0.05] transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest ml-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 focus:bg-white/[0.05] transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-gradient text-navy-950 font-black py-5 rounded-2xl shadow-2xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] font-bold text-navy-500 uppercase tracking-widest">
            Already a member?{' '}
            <Link to="/signin" className="text-gold-400 hover:text-white transition-colors border-b border-gold-400/30 pb-0.5 ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

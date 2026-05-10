import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, Cross, Eye, EyeOff, Sparkles, Shield, BookOpen } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

const FEATURE_HIGHLIGHTS = [
  { icon: BookOpen, text: 'AI-powered Bible study & chat' },
  { icon: Sparkles, text: 'Personalised daily devotionals' },
  { icon: Shield, text: 'Sacred prayer journal' },
];

const SCRIPTURE_QUOTE = {
  text: 'Your word is a lamp to my feet and a light to my path.',
  ref: 'Psalm 119:105',
};

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : signInError.message
      );
      setLoading(false);
      return;
    }
    trackEvent('signin_success');
    navigate('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (googleError) {
      setError(googleError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex relative overflow-hidden">
      {/* Left Panel: Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-[#0a1628] to-[#020617]" />
        <div className="absolute top-0 left-0 w-[70%] h-[70%] bg-gold-400/8 rounded-full blur-[140px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-blue-500/6 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 group w-fit">
            <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20 group-hover:scale-110 transition-transform">
              <Cross className="w-5 h-5 text-navy-950" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">BibleAI</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
              Deepen your<br />
              <span className="text-gold-gradient bg-clip-text text-transparent">faith journey</span>
            </h2>
            <p className="text-navy-300 text-lg leading-relaxed">
              Scripture, prayer, and AI-guided devotion — all in one sacred space.
            </p>
          </div>
          <div className="space-y-4">
            {FEATURE_HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-9 h-9 bg-gold-400/10 border border-gold-400/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gold-400" />
                </div>
                <p className="text-navy-200 text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
          <blockquote className="border-l-2 border-gold-400/40 pl-5">
            <p className="text-navy-200 text-sm italic leading-relaxed">
              &ldquo;{SCRIPTURE_QUOTE.text}&rdquo;
            </p>
            <cite className="text-[11px] font-black text-gold-400/70 uppercase tracking-widest mt-2 block not-italic">
              — {SCRIPTURE_QUOTE.ref}
            </cite>
          </blockquote>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] text-navy-600 font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} BibleAI &bull; Built with faith
          </p>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gold-400/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gold-gradient rounded-2xl flex items-center justify-center shadow-xl shadow-gold-400/20 group-hover:scale-110 transition-transform">
                <Cross className="w-6 h-6 text-navy-950" />
              </div>
              <span className="text-white font-bold text-2xl tracking-tight">BibleAI</span>
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome back</h1>
              <p className="text-navy-400 text-sm">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="text-gold-400 font-bold hover:text-white transition-colors">
                  Create one free
                </Link>
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm active:scale-[0.98] disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.79 1.97l3.58-3.58C18.16 1.28 15.3 0 12 0 7.31 0 3.25 2.67 1.24 6.56l4.12 3.19C6.33 6.94 8.94 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.56-.19-2.3H12v4.51h6.47c-.28 1.48-1.11 2.73-2.36 3.57l3.66 2.84c2.14-1.97 3.39-4.87 3.39-8.62z" />
                  <path fill="#FBBC05" d="M5.36 14.25c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25L1.24 6.56C.45 8.12 0 9.97 0 12s.45 3.88 1.24 5.44l4.12-3.19z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.17-4.3 1.17-3.14 0-5.8-2.12-6.75-4.97l-4.12 3.19C3.25 21.33 7.31 24 12 24z" />
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#020617] px-4 text-[10px] font-black uppercase tracking-[0.3em] text-navy-600">
                  Or sign in with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              {error && (
                <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-400 text-[10px] font-black">!</span>
                  </div>
                  <p className="text-xs text-red-400 font-semibold">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Password</label>
                    <Link to="/forgot-password" className="text-[10px] font-bold text-navy-600 hover:text-gold-400 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-600 hover:text-navy-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gold-gradient text-navy-950 font-black py-4 rounded-2xl shadow-xl shadow-gold-400/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm overflow-hidden disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                  <>
                    <span className="relative z-10 uppercase tracking-widest">Sign In</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-navy-600">
              By signing in, you agree to our{' '}
              <Link to="/terms" className="text-navy-400 hover:text-white transition-colors">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-navy-400 hover:text-white transition-colors">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

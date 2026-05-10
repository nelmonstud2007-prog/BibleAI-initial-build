import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, User, CheckCircle2, Cross, Eye, EyeOff, Sparkles, Heart, BookOpen, AtSign, AlertCircle, Check, X as XIcon } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

const SOCIAL_PROOF = [
  { count: '50K+', label: 'Believers' },
  { count: '1M+', label: 'Prayers Logged' },
  { count: '4.9★', label: 'Rating' },
];

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // Username availability debounce
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    setUsernameAvailable(null);
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);
    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [username]);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-400'][passwordStrength];
  const strengthTextColor = ['', 'text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400'][passwordStrength];

  const validateUsername = (u: string) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!validateUsername(username)) { setError('Username must be 3–20 characters: letters, numbers, underscores only.'); return; }
    if (passwordStrength < 2) { setError('Password is too weak. Use at least 8 characters with letters and numbers.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreedToTerms) { setError('You must agree to the Terms of Service and Privacy Policy.'); return; }
    setLoading(true);
    try {
      // Final check if debounce hasn't confirmed availability
      if (usernameAvailable === false) { setError('That username is already taken.'); setLoading(false); return; }
      if (usernameAvailable === null) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle();
        if (existing) { setError('That username is already taken.'); setLoading(false); return; }
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, username: username.toLowerCase() },
          emailRedirectTo: `${window.location.origin}/email-confirmed`,
        },
      });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      if (data?.user) {
        await new Promise(r => setTimeout(r, 800));
        await supabase.from('profiles').update({ username: username.toLowerCase(), full_name: fullName }).eq('id', data.user.id);
        trackEvent('signup_success');
        setSuccess(true);
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleGoogleSignUp = async () => {
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

  if (success) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-400/5 rounded-full blur-[120px]" />
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] text-center space-y-8 animate-scale-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-400/10 rounded-3xl border border-emerald-400/20 shadow-2xl shadow-emerald-400/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Check your inbox</h2>
              <p className="text-navy-300 text-sm leading-relaxed">
                We sent a confirmation link to <span className="text-white font-bold">{email}</span>.
                Click it to activate your account and begin your journey.
              </p>
            </div>
            <div className="bg-gold-400/5 border border-gold-400/20 rounded-2xl p-4">
              <p className="text-xs text-navy-300 font-medium">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button onClick={() => setSuccess(false)} className="text-gold-400 hover:text-white transition-colors font-bold">
                  try again
                </button>
              </p>
            </div>
            <Link
              to="/signin"
              className="block w-full text-center py-4 bg-gold-gradient text-navy-950 font-black rounded-2xl hover:scale-[1.02] transition-all text-sm uppercase tracking-widest shadow-xl shadow-gold-400/10"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex relative overflow-hidden">
      {/* Left Panel: Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-[#0a1628] to-[#020617]" />
        <div className="absolute top-0 left-0 w-[70%] h-[70%] bg-gold-400/8 rounded-full blur-[140px] -translate-x-1/4 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none" />
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
              Begin your<br />
              <span className="text-gold-gradient bg-clip-text text-transparent">sacred journey</span>
            </h2>
            <p className="text-navy-300 text-lg leading-relaxed">
              Join thousands of believers growing in faith through the power of AI and Scripture.
            </p>
          </div>

          {/* Social proof */}
          <div className="grid grid-cols-3 gap-4">
            {SOCIAL_PROOF.map(({ count, label }) => (
              <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-xl font-black text-gold-400">{count}</p>
                <p className="text-[10px] font-bold text-navy-500 uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {[
              { icon: BookOpen, text: 'Unlimited Bible reading with AI insights' },
              { icon: Heart, text: 'Prayer journal with answered prayer tracking' },
              { icon: Sparkles, text: 'Daily personalised devotionals' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-9 h-9 bg-gold-400/10 border border-gold-400/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gold-400" />
                </div>
                <p className="text-navy-200 text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] text-navy-600 font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} BibleAI &bull; Free to start
          </p>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gold-400/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]" />
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
              <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create your account</h1>
              <p className="text-navy-400 text-sm">
                Already have one?{' '}
                <Link to="/signin" className="text-gold-400 font-bold hover:text-white transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <button
              onClick={handleGoogleSignUp}
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
                  Or create with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
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
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Full Name <span className="text-navy-600 normal-case">(kept private)</span></label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl pl-12 pr-5 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                      placeholder="Your real name (never shown publicly)"
                    />
                  </div>
                </div>
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Username <span className="text-navy-600 normal-case">(public)</span></label>
                  <div className="relative group">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      required
                      autoComplete="username"
                      maxLength={20}
                      className={`w-full bg-white/[0.03] border rounded-2xl pl-12 pr-10 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:bg-white/[0.05] transition-all ${
                        usernameAvailable === true ? 'border-emerald-400/40 focus:border-emerald-400/60' :
                        usernameAvailable === false ? 'border-red-400/40 focus:border-red-400/60' :
                        'border-white/8 focus:border-gold-400/40'
                      }`}
                      placeholder="your_username (3–20 chars)"
                    />
                    {/* Availability indicator */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {checkingUsername && <Loader2 className="w-4 h-4 text-navy-500 animate-spin" />}
                      {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-emerald-400" />}
                      {!checkingUsername && usernameAvailable === false && <XIcon className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                </div>

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
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-600 hover:text-navy-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1.5 animate-slide-up-fade">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              passwordStrength >= level ? strengthColor : 'bg-white/5'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-navy-500">
                        Strength: <span className={strengthTextColor}>{strengthLabel}</span>
                      </p>
                    </div>
                  )}
                </div>
                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={`w-full bg-white/[0.03] border rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:bg-white/[0.05] transition-all ${
                        confirmPassword && password !== confirmPassword ? 'border-red-500/40 focus:border-red-500/60' :
                        confirmPassword && password === confirmPassword ? 'border-emerald-500/40 focus:border-emerald-500/60' :
                        'border-white/8 focus:border-gold-400/40'
                      }`}
                      placeholder="Re-enter your password"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-600 hover:text-navy-300 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] font-bold text-red-400 ml-1 animate-slide-up-fade">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Terms Agreement */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                  agreedToTerms ? 'bg-gold-400 border-gold-400' : 'border-white/20 bg-white/5 group-hover:border-gold-400/40'
                }`} onClick={() => setAgreedToTerms(!agreedToTerms)}>
                  {agreedToTerms && <span className="text-navy-950 text-[10px] font-black">✓</span>}
                </div>
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="sr-only" />
                <span className="text-[11px] text-navy-400 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-gold-400 hover:text-gold-300 transition-colors font-semibold" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-gold-400 hover:text-gold-300 transition-colors font-semibold" target="_blank">Privacy Policy</Link>
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="group relative w-full bg-gold-gradient text-navy-950 font-black py-4 rounded-2xl shadow-xl shadow-gold-400/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                  <>
                    <span className="relative z-10 uppercase tracking-widest">Create Free Account</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}

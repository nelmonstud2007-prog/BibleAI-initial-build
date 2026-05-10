import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Cross } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

interface PasswordStrength {
  score: number; // 0-4
  feedback: string;
  isValid: boolean;
}

const validatePassword = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Lowercase letter');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Number');

  if (/[!@#$%^&*]/.test(password)) score++;
  else feedback.push('Special character');

  return {
    score: Math.min(score, 4),
    feedback: feedback.length > 0 ? `Add: ${feedback.join(', ')}` : 'Strong password',
    isValid: score >= 3,
  };
};

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginWith, setLoginWith] = useState<'email' | 'username'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (mode === 'signup') {
      setPasswordStrength(validatePassword(value));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordStrength?.isValid) {
      setError('Password is too weak');
      return;
    }

    setLoading(true);
    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: fullName,
            username: username,
            email: email,
          });

        if (profileError) throw profileError;

        setError('');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const identifier = loginWith === 'email' ? email : username;
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let signInEmail = identifier;

      // If logging in with username, look up the email
      if (loginWith === 'username') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .single();

        if (profileError || !profileData) {
          throw new Error('Username not found');
        }

        signInEmail = profileData.email;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password,
      });

      if (signInError) throw signInError;

      setError('');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrengthColor = passwordStrength
    ? passwordStrength.score <= 1
      ? 'text-red-500'
      : passwordStrength.score <= 2
      ? 'text-yellow-500'
      : passwordStrength.score <= 3
      ? 'text-blue-500'
      : 'text-green-500'
    : '';

  const passwordStrengthBg = passwordStrength
    ? passwordStrength.score <= 1
      ? 'bg-red-500/20'
      : passwordStrength.score <= 2
      ? 'bg-yellow-500/20'
      : passwordStrength.score <= 3
      ? 'bg-blue-500/20'
      : 'bg-green-500/20'
    : '';

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold-400 rounded-lg mb-4">
            <Cross className="w-6 h-6 text-navy-950" />
          </div>
          <h1 className="text-3xl font-black text-white">BibleAI</h1>
          <p className="text-navy-400 text-sm mt-2">Deepen your faith journey</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-navy-900 p-1 rounded-lg">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              mode === 'signin'
                ? 'bg-gold-400 text-navy-950'
                : 'text-navy-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              mode === 'signup'
                ? 'bg-gold-400 text-navy-950'
                : 'text-navy-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-navy-900 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Choose a username"
                  className="w-full bg-navy-900 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
                />
              </div>
            </>
          )}

          {mode === 'signin' && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setLoginWith('email')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  loginWith === 'email'
                    ? 'bg-gold-400/20 text-gold-400 border border-gold-400/50'
                    : 'bg-navy-900 text-navy-400 border border-navy-800'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginWith('username')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  loginWith === 'username'
                    ? 'bg-gold-400/20 text-gold-400 border border-gold-400/50'
                    : 'bg-navy-900 text-navy-400 border border-navy-800'
                }`}
              >
                Username
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
              {loginWith === 'email' || mode === 'signup' ? 'Email Address' : 'Username'}
            </label>
            <input
              type={loginWith === 'email' || mode === 'signup' ? 'email' : 'text'}
              value={loginWith === 'email' || mode === 'signup' ? email : username}
              onChange={(e) => {
                if (loginWith === 'email' || mode === 'signup') {
                  setEmail(e.target.value);
                } else {
                  setUsername(e.target.value.toLowerCase());
                }
              }}
              placeholder={loginWith === 'email' || mode === 'signup' ? 'name@example.com' : 'username'}
              className="w-full bg-navy-900 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-navy-900 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'signup' && passwordStrength && (
              <div className={`mt-2 p-2 rounded-lg ${passwordStrengthBg}`}>
                <p className={`text-xs font-medium ${passwordStrengthColor}`}>
                  {passwordStrength.feedback}
                </p>
              </div>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-navy-900 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-navy-800 text-gold-400 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-navy-400">
                I agree to the{' '}
                <a href="/terms" className="text-gold-400 hover:text-gold-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-gold-400 hover:text-gold-300">
                  Privacy Policy
                </a>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-gradient text-navy-950 font-bold py-3 rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-navy-500 mt-6">
          © 2026 BibleAI • Built with Faith
        </p>
      </div>
    </div>
  );
}

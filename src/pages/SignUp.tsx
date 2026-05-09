import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Cross, Eye, EyeOff, Loader2 } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import { FcGoogle } from 'react-icons/fc';
import { getAppUrl } from '../lib/appUrl';

export default function SignUp() {
  const { user, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      trackEvent('user_sign_up', { method: 'email_password' });
      setSuccess(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const redirectTo = `${getAppUrl()}/email-confirmed`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold-400 rounded-xl mb-4">
            <Cross className="w-6 h-6 text-navy-950" />
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-navy-300">
            We've sent you a confirmation link. Please verify your email to get started.
          </p>
          <Link
            to="/signin"
            className="mt-6 inline-block text-sm text-gold-400 hover:text-gold-300 font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 grid lg:grid-cols-2">
      <div className="relative hidden lg:flex overflow-hidden border-r border-navy-800">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-950" />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-gold-400/10 blur-3xl rounded-full" />
        <div className="absolute bottom-8 right-8 w-56 h-56 bg-gold-400/10 blur-3xl rounded-full" />

        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="w-11 h-11 bg-gold-400 rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20">
                <Cross className="w-5 h-5 text-navy-950" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">BibleAI</span>
            </div>
            <div className="mt-8 h-1 w-20 rounded-full bg-gold-400/80" />
          </div>

          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.2em] text-gold-400/80 mb-4">Verse of Encouragement</p>
            <blockquote className="text-2xl leading-relaxed font-semibold text-white">
              “Your word is a lamp for my feet, a light on my path.”
            </blockquote>
            <p className="mt-4 text-gold-300 font-medium">Psalm 119:105</p>
          </div>

          <p className="text-xs text-navy-400">Build daily habits of scripture, prayer, and reflection.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gold-400 rounded-xl mb-4">
              <Cross className="w-6 h-6 text-navy-950" />
            </div>
            <h1 className="text-2xl font-bold text-white">BibleAI</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Create your account</h2>
            <p className="mt-2 text-sm text-navy-300">Begin your journey with BibleAI</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-navy-900/60 border border-navy-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-black/30"
          >
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-100 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <FcGoogle className="w-5 h-5" />
                  Continue with Google
                </span>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-navy-700" />
              <span className="text-xs text-navy-400 uppercase tracking-wider">or continue with email</span>
              <div className="h-px flex-1 bg-navy-700" />
            </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
              className="w-full bg-gold-400 text-navy-950 font-semibold py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-400/20"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="text-center text-sm text-navy-400">
            Already have an account?{' '}
            <Link to="/signin" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
          </form>
        </div>
      </div>
    </div>
  );
}

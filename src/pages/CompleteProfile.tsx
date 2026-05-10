import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Cross, Sparkles, Heart, ArrowRight, AlertCircle, Check, X as XIcon, AtSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function CompleteProfile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [favoriteVerse, setFavoriteVerse] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Username validation
  useEffect(() => {
    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      setUsernameError('');
      return;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);
    setUsernameError('');

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username, favorite_bible_verse, profile_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.profile_completed) {
        setAlreadyCompleted(true);
      } else {
        setDisplayName(data?.full_name || user.user_metadata?.full_name || '');
        setUsername(data?.username || '');
        setFavoriteVerse(data?.favorite_bible_verse || '');
      }
      setProfileLoading(false);
    };

    void loadProfile();
  }, [user?.id]);

  const validateUsername = (u: string) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (displayName.length > 100) {
      setError('Full name must be less than 100 characters.');
      return;
    }

    if (!validateUsername(username)) {
      setError('Username must be 3–20 characters: letters, numbers, underscores only.');
      return;
    }

    if (usernameAvailable === false) {
      setError('That username is already taken.');
      return;
    }

    if (usernameAvailable === null) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      if (existing) {
        setError('That username is already taken.');
        return;
      }
    }

    if (favoriteVerse && favoriteVerse.length > 100) {
      setError('Favorite verse must be less than 100 characters.');
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: displayName.trim(),
        username: username.toLowerCase(),
        favorite_bible_verse: favoriteVerse.trim() || null,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user?.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save profile');
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-gold-400 animate-spin" />
        <p className="text-[10px] font-black text-navy-500 uppercase tracking-[0.3em] animate-pulse">Preparing your experience...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  if (alreadyCompleted) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 relative overflow-hidden mesh-gradient">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl relative group">
        {/* Glow behind card */}
        <div className="absolute -inset-1 bg-gold-gradient rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-all duration-700" />
        
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-gradient rounded-2xl shadow-xl shadow-gold-400/20 mb-2 transform hover:rotate-3 transition-transform">
              <Cross className="w-8 h-8 text-navy-950" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">Complete Your Profile</h1>
              <p className="text-navy-400 text-sm font-medium">Customize your experience before we begin.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-xs text-red-400 font-bold flex items-start gap-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Full Name</label>
                  <span className="text-[9px] text-navy-600">{displayName.length}/100</span>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 100))}
                    required
                    maxLength={100}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="Your full name"
                  />
                </div>
                <p className="text-[9px] text-navy-600">Used for personalization only, never shown publicly.</p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Public Username</label>
                  <span className="text-[9px] text-navy-600">{username.length}/20</span>
                </div>
                <div className="relative group">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-600 group-focus-within:text-gold-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                    required
                    maxLength={20}
                    className={`w-full bg-white/[0.02] border rounded-2xl pl-12 pr-10 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:bg-white/[0.05] transition-all ${
                      usernameAvailable === true ? 'border-emerald-400/40 focus:border-emerald-400/60' :
                      usernameAvailable === false ? 'border-red-400/40 focus:border-red-400/60' :
                      'border-white/5 focus:border-gold-400/30'
                    }`}
                    placeholder="your_username"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {checkingUsername && <Loader2 className="w-4 h-4 text-navy-500 animate-spin" />}
                    {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-emerald-400" />}
                    {!checkingUsername && usernameAvailable === false && <XIcon className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
                <p className="text-[9px] text-navy-600">3–20 characters: letters, numbers, underscores only.</p>
              </div>

              {/* Favorite Verse */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Favourite Scripture (Optional)</label>
                  <span className="text-[9px] text-navy-600">{favoriteVerse.length}/100</span>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    value={favoriteVerse}
                    onChange={(e) => setFavoriteVerse(e.target.value.slice(0, 100))}
                    maxLength={100}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="e.g. John 3:16"
                  />
                </div>
                <p className="text-[9px] text-navy-600">Your favorite Bible verse or passage.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !displayName.trim() || !validateUsername(username) || usernameAvailable === false}
              className="group w-full bg-gold-gradient text-navy-950 font-black py-5 rounded-2xl shadow-2xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                   Get Started
                   <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] font-black text-navy-600 uppercase tracking-[0.3em]">
            BibleAI &bull; Excellence in Tech
          </p>
        </div>
      </div>
    </div>
  );
}

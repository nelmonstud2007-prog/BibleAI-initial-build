import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Cross, Sparkles, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function CompleteProfile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [favoriteVerse, setFavoriteVerse] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, favorite_bible_verse, profile_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.profile_completed) {
        setAlreadyCompleted(true);
      } else {
        setDisplayName(data?.full_name || user.user_metadata?.full_name || '');
        setFavoriteVerse(data?.favorite_bible_verse || '');
      }
      setProfileLoading(false);
    };

    void loadProfile();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setError('');
    setSaving(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: displayName.trim(),
        favorite_bible_verse: favoriteVerse.trim() || null,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

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
              <h1 className="text-3xl font-bold text-white tracking-tight">Final Step</h1>
              <p className="text-navy-400 text-sm font-medium">Customize your experience before we begin.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-xs text-red-400 font-bold flex items-center gap-2">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest ml-2">Full Name</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-widest ml-2">Favourite Scripture (Optional)</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={favoriteVerse}
                    onChange={(e) => setFavoriteVerse(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 transition-all"
                    placeholder="e.g. John 3:16"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="group w-full bg-gold-gradient text-navy-950 font-black py-5 rounded-2xl shadow-2xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
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

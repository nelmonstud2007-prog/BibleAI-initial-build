import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Cross, Loader2 } from 'lucide-react';
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
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  if (alreadyCompleted) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-navy-900/60 border border-navy-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/30">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold-400 rounded-xl mb-4">
            <Cross className="w-6 h-6 text-navy-950" />
          </div>
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="mt-2 text-sm text-navy-300">Welcome to BibleAI! Let&apos;s set up your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">
              Favourite Bible verse (optional)
            </label>
            <input
              type="text"
              value={favoriteVerse}
              onChange={(e) => setFavoriteVerse(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
              placeholder="e.g. Jeremiah 29:11"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="w-full bg-gold-400 text-navy-950 font-semibold py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-400/20"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Get Started'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

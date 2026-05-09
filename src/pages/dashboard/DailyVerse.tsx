import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Sun,
  BookOpen,
  Share2,
  BookmarkPlus,
  Check,
  Loader2,
  Cross,
} from 'lucide-react';
import UpgradeModal from '../../components/UpgradeModal';
import ShareImageModal from '../../components/ShareImageModal';

interface Devotional {
  id?: string;
  date: string;
  verse: string;
  verse_ref: string;
  reflection: string;
  prayer_prompt: string;
}

export default function DailyVerse() {
  const { user, limits } = useAuth();
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingToJournal, setSavingToJournal] = useState(false);
  const [savedToJournal, setSavedToJournal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (user) fetchDevotional();
  }, [user]);

  const fetchDevotional = async () => {
    if (!user) return;

    // First check if we already have it cached locally
    const today = new Date().toISOString().split('T')[0];
    const { data: cached, error: cachedError } = await supabase
      .from('daily_devotionals')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (cachedError) {
      console.error('Failed to check cached devotional:', cachedError);
    }

    if (cached) {
      setDevotional(cached);
      setLoading(false);
      return;
    }

    // Otherwise call the edge function to generate
    try {
      const { data, error } = await supabase.functions.invoke('daily-devotional', {
        method: 'GET',
      });

      if (!error && data) {
        setDevotional(data);
      } else if (error) {
        console.error('Failed to fetch devotional:', error);
      }
    } catch (err) {
      console.error('Failed to fetch devotional:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!devotional) return;
    setShareOpen(true);
  };

  const handleSaveToJournal = async () => {
    if (!user || !devotional || savingToJournal) return;

    // Check prayer limit for free users
    if (limits?.prayers.limit_reached) {
      setShowUpgrade(true);
      return;
    }

    setSavingToJournal(true);

    try {
      const { data, error } = await supabase
        .from('prayer_journal_entries')
        .insert({
          user_id: user.id,
          title: `Daily Devotional: ${devotional.verse_ref}`,
          content: `"${devotional.verse}"\n\n${devotional.reflection}\n\nPrayer: ${devotional.prayer_prompt}`,
          category: 'Gratitude',
          status: 'praying',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSavedToJournal(true);
        setTimeout(() => setSavedToJournal(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save to journal:', err);
    } finally {
      setSavingToJournal(false);
    }
  };

  const today = new Date();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        limitType="prayers"
        limitDetail="Free plan includes up to 10 prayer journal entries"
      />
      <ShareImageModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        heading={devotional?.verse_ref || 'Daily Devotional'}
        content={devotional?.verse || ''}
      />

      {/* Header with date */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Daily Devotional</h1>
          <p className="mt-1 text-sm text-navy-300">Let God's Word speak into your day</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">
            {today.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-xs text-navy-400">
            {today.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-navy-400">Preparing today's devotional...</p>
        </div>
      ) : !devotional ? (
        <div className="text-center py-20 px-4">
          <div className="mx-auto w-full max-w-xl bg-gradient-to-br from-navy-900/70 to-navy-900/40 border border-gold-400/20 rounded-3xl p-8 sm:p-10">
            <div className="w-20 h-20 rounded-2xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-gold-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Today&apos;s devotional isn&apos;t ready yet</h3>
            <p className="text-sm text-navy-300 mb-7">
              We had trouble loading your daily verse. Try again and we&apos;ll prepare it for you.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                fetchDevotional();
              }}
              className="inline-flex items-center gap-2 bg-gold-400 text-navy-950 font-semibold px-6 py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Loader2 className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Verse Card */}
          <div className="bg-gradient-to-br from-navy-900 via-navy-900/80 to-navy-900/50 border border-gold-400/20 rounded-2xl p-6 sm:p-8 mb-6 relative overflow-hidden">
            {/* Decorative cross watermark */}
            <div className="absolute top-4 right-4 opacity-[0.04]">
              <Cross className="w-32 h-32 text-gold-400" />
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <Sun className="w-5 h-5 text-gold-400" />
                <p className="text-xs font-medium text-gold-400 uppercase tracking-wider">
                  Today's Verse
                </p>
              </div>

              <blockquote className="text-lg sm:text-xl text-white leading-relaxed italic mb-4">
                &ldquo;{devotional.verse}&rdquo;
              </blockquote>
              <p className="text-sm text-gold-400 font-semibold">
                {devotional.verse_ref}
              </p>
            </div>
          </div>

          {/* Reflection */}
          <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-gold-400" />
              <h2 className="text-base font-semibold text-white">Reflection</h2>
            </div>
            <div className="space-y-4">
              {devotional.reflection.split('\n\n').map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm text-navy-200 leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Prayer Prompt */}
          <div className="bg-navy-900/50 border border-gold-400/10 rounded-2xl p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Cross className="w-4 h-4 text-gold-400" />
              <h2 className="text-base font-semibold text-white">Prayer Prompt</h2>
            </div>
            <p className="text-sm text-navy-200 leading-relaxed italic">
              {devotional.prayer_prompt}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 bg-navy-900/50 border border-navy-700 text-white font-medium px-5 py-3 rounded-xl hover:border-navy-600 hover:bg-navy-800/50 transition-all text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share Verse
            </button>

            <button
              onClick={handleSaveToJournal}
              disabled={savingToJournal || savedToJournal}
              className="flex-1 flex items-center justify-center gap-2 bg-gold-400/10 border border-gold-400/20 text-gold-400 font-medium px-5 py-3 rounded-xl hover:bg-gold-400/20 transition-all text-sm disabled:opacity-60"
            >
              {savingToJournal ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : savedToJournal ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved to Journal
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  Save to Journal
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

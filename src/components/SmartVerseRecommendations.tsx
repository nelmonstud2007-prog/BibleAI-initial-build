import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Sparkles, BookOpen, ChevronRight, Loader2, RefreshCw, Heart } from 'lucide-react';

interface Recommendation {
  verse_ref: string;
  verse_text: string;
  reason: string;
  theme: string;
}

const FALLBACK_RECOMMENDATIONS: Recommendation[] = [
  {
    verse_ref: 'Philippians 4:6-7',
    verse_text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
    reason: 'A foundational verse for peace in uncertainty',
    theme: 'Peace',
  },
  {
    verse_ref: 'Isaiah 40:31',
    verse_text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.',
    reason: 'Encouragement for those seeking strength',
    theme: 'Strength',
  },
  {
    verse_ref: 'Psalm 23:1',
    verse_text: 'The Lord is my shepherd, I lack nothing.',
    reason: 'Comfort and provision in all circumstances',
    theme: 'Trust',
  },
];

export default function SmartVerseRecommendations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [context, setContext] = useState('');

  const fetchRecommendations = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Gather user context: recent prayers, bookmarks, faith level
      const [prayersRes, bookmarksRes, profileRes] = await Promise.all([
        supabase.from('prayer_journal_entries').select('title, content, category').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('verse_bookmarks').select('verse_ref, verse_text').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('faith_level, spiritual_goal, full_name').eq('id', user.id).single(),
      ]);

      const prayers = prayersRes.data || [];
      const bookmarks = bookmarksRes.data || [];
      const profile = profileRes.data;

      // Build context summary
      const prayerThemes = prayers.map((p: any) => `${p.category || 'General'}: ${p.title}`).join(', ');
      const bookmarkRefs = bookmarks.map((b: any) => b.verse_ref).join(', ');
      const faithLevel = profile?.faith_level || 'intermediate';
      const goal = profile?.spiritual_goal || 'grow in faith';

      const contextSummary = `Faith level: ${faithLevel}. Spiritual goal: ${goal}. Recent prayers about: ${prayerThemes || 'various topics'}. Bookmarked verses: ${bookmarkRefs || 'none yet'}.`;
      setContext(contextSummary);

      // Call AI for personalized recommendations
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verse-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ context: contextSummary, count: 3 }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        } else {
          setRecommendations(FALLBACK_RECOMMENDATIONS);
        }
      } else {
        setRecommendations(FALLBACK_RECOMMENDATIONS);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setRecommendations(FALLBACK_RECOMMENDATIONS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const handleVerseClick = (rec: Recommendation) => {
    navigate('/dashboard/bible-chat', {
      state: { initialMessage: `Please help me understand and reflect on ${rec.verse_ref}: "${rec.verse_text}"` }
    });
  };

  if (loading) {
    return (
      <div className="bg-navy-900/40 border border-white/5 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gold-400/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-gold-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">For You</h3>
            <p className="text-xs text-navy-500">AI-powered verse recommendations</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 bg-navy-800 rounded w-1/3" />
              <div className="h-2.5 bg-navy-800 rounded w-full" />
              <div className="h-2.5 bg-navy-800 rounded w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold-400/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-gold-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">For You</h3>
            <p className="text-xs text-navy-500">Based on your prayers & bookmarks</p>
          </div>
        </div>
        <button onClick={() => fetchRecommendations(true)} disabled={refreshing}
          className="p-2 text-navy-500 hover:text-gold-400 transition-colors" aria-label="Refresh recommendations">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <button key={i} onClick={() => handleVerseClick(rec)}
            className="w-full text-left p-4 bg-navy-950/50 border border-white/5 rounded-2xl hover:border-gold-400/20 hover:bg-navy-950/80 transition-all group">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gold-400">{rec.verse_ref}</span>
                <span className="text-[10px] text-navy-600 bg-navy-800 px-2 py-0.5 rounded-full">{rec.theme}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-navy-600 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-navy-300 leading-relaxed line-clamp-2 italic">"{rec.verse_text}"</p>
            <p className="text-[11px] text-navy-500 mt-2 flex items-center gap-1">
              <Heart className="w-3 h-3" /> {rec.reason}
            </p>
          </button>
        ))}
      </div>

      <button onClick={() => navigate('/dashboard/bible-chat')}
        className="w-full py-2.5 rounded-xl border border-white/5 text-navy-400 text-xs font-bold hover:text-white hover:border-white/10 transition-all flex items-center justify-center gap-2">
        <BookOpen className="w-3.5 h-3.5" /> Explore More in Bible Chat
      </button>
    </div>
  );
}

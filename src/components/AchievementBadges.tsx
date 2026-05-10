import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Award, Star, Flame, BookOpen, Heart, Users, Zap, Shield, Lock } from 'lucide-react';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  earned_at: string | null;
}

const BADGE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  first_prayer:        { icon: Heart,    color: 'text-pink-400',    bg: 'bg-pink-400/10',    border: 'border-pink-400/30' },
  streak_7:            { icon: Flame,    color: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/30' },
  streak_30:           { icon: Zap,      color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30' },
  verses_100:          { icon: BookOpen, color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30' },
  community_contrib:   { icon: Users,    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  first_share:         { icon: Star,     color: 'text-gold-400',    bg: 'bg-gold-400/10',    border: 'border-gold-400/30' },
  prayer_warrior:      { icon: Shield,   color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/30' },
  bible_scholar:       { icon: Award,    color: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/30' },
};

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', key: 'first_prayer',      name: 'First Prayer',         description: 'Write your first prayer entry',              earned_at: null },
  { id: '2', key: 'streak_7',          name: '7-Day Streak',         description: 'Use BibleAI 7 days in a row',                earned_at: null },
  { id: '3', key: 'streak_30',         name: '30-Day Streak',        description: 'Use BibleAI 30 days in a row',               earned_at: null },
  { id: '4', key: 'verses_100',        name: '100 Verses Read',      description: 'Read 100 Bible verses',                     earned_at: null },
  { id: '5', key: 'community_contrib', name: 'Community Contributor',description: 'Share 5 verses with the community',          earned_at: null },
  { id: '6', key: 'first_share',       name: 'First Share',          description: 'Create and share your first verse image',   earned_at: null },
  { id: '7', key: 'prayer_warrior',    name: 'Prayer Warrior',       description: 'Write 50 prayer entries',                   earned_at: null },
  { id: '8', key: 'bible_scholar',     name: 'Bible Scholar',        description: 'Complete 10 Bible chat conversations',      earned_at: null },
];

interface Props {
  compact?: boolean;
  userId?: string;
}

export default function AchievementBadges({ compact = false, userId }: Props) {
  const { user } = useAuth();
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;
    supabase
      .from('user_achievements')
      .select('badge_id, earned_at')
      .eq('user_id', targetUserId)
      .then(({ data }) => {
        const keys = new Set<string>();
        const dates: Record<string, string> = {};
        (data || []).forEach((a: any) => {
          keys.add(a.badge_id);
          dates[a.badge_id] = a.earned_at;
        });
        setEarned(keys);
        setEarnedDates(dates);
        setLoading(false);
      });
  }, [targetUserId]);

  const earnedCount = ALL_ACHIEVEMENTS.filter((a) => earned.has(a.key)).length;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {ALL_ACHIEVEMENTS.filter((a) => earned.has(a.key)).slice(0, 5).map((a) => {
          const meta = BADGE_META[a.key] || BADGE_META.first_prayer;
          const Icon = meta.icon;
          return (
            <div key={a.key} className={`w-8 h-8 rounded-full ${meta.bg} ${meta.border} border flex items-center justify-center`}
              title={a.name}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
          );
        })}
        {earnedCount > 5 && (
          <div className="w-8 h-8 rounded-full bg-navy-800 border border-white/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-navy-400">+{earnedCount - 5}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-gold-400" /> Achievements
        </h3>
        <span className="text-xs text-navy-400 font-bold">{earnedCount}/{ALL_ACHIEVEMENTS.length} earned</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
        <div className="h-full bg-gold-gradient rounded-full transition-all duration-700"
          style={{ width: `${(earnedCount / ALL_ACHIEVEMENTS.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_ACHIEVEMENTS.map((achievement) => {
          const isEarned = earned.has(achievement.key);
          const meta = BADGE_META[achievement.key] || BADGE_META.first_prayer;
          const Icon = meta.icon;
          const earnedDate = earnedDates[achievement.key];

          return (
            <div key={achievement.key}
              className={`relative p-4 rounded-2xl border text-center transition-all cursor-default ${isEarned ? `${meta.bg} ${meta.border}` : 'bg-navy-900/30 border-white/5 opacity-50'}`}
              onMouseEnter={() => setTooltip(achievement.key)}
              onMouseLeave={() => setTooltip(null)}
              role="img"
              aria-label={`${achievement.name}: ${isEarned ? 'Earned' : 'Not yet earned'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isEarned ? meta.bg : 'bg-navy-800'}`}>
                {isEarned ? (
                  <Icon className={`w-6 h-6 ${meta.color}`} />
                ) : (
                  <Lock className="w-5 h-5 text-navy-600" />
                )}
              </div>
              <p className={`text-xs font-bold ${isEarned ? 'text-white' : 'text-navy-500'}`}>{achievement.name}</p>
              {isEarned && earnedDate && (
                <p className="text-[10px] text-navy-400 mt-1">
                  {new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}

              {/* Tooltip */}
              {tooltip === achievement.key && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-navy-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white whitespace-nowrap shadow-xl pointer-events-none">
                  {achievement.description}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-800" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

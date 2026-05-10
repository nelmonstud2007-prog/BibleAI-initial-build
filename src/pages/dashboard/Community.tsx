import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Heart,
  Share2,
  Plus,
  X,
  Loader2,
  Sparkles,
  Cross,
  Users,
  Eye,
  EyeOff,
  Send,
  ChevronDown,
} from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

interface CommunityPost {
  id: string;
  verse_ref: string;
  verse_text: string;
  reflection: string | null;
  is_anonymous: boolean;
  author_name: string | null;
  like_count: number;
  user_has_liked: boolean;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [verseRef, setVerseRef] = useState('');
  const [verseText, setVerseText] = useState('');
  const [reflection, setReflection] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likingId, setLikingId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (!user) return;
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const enriched = (data ?? []).map((post: any) => ({
        ...post,
        user_has_liked: false, // will be enriched below
      }));

      // Check which posts the user has liked
      if (enriched.length > 0) {
        const postIds = enriched.map((p: CommunityPost) => p.id);
        const { data: likes } = await supabase
          .from('community_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedSet = new Set((likes ?? []).map((l: any) => l.post_id));
        enriched.forEach((p: CommunityPost) => {
          p.user_has_liked = likedSet.has(p.id);
        });
      }

      if (append) {
        setPosts((prev) => [...prev, ...enriched]);
      } else {
        setPosts(enriched);
      }
      setHasMore(enriched.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, page, fetchPosts]);

  const handleLike = async (post: CommunityPost) => {
    if (!user || likingId === post.id) return;
    setLikingId(post.id);

    const wasLiked = post.user_has_liked;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, user_has_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      )
    );

    try {
      if (wasLiked) {
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        await supabase
          .from('community_posts')
          .update({ like_count: post.like_count - 1 })
          .eq('id', post.id);
      } else {
        await supabase
          .from('community_post_likes')
          .insert({ user_id: user.id, post_id: post.id });
        await supabase
          .from('community_posts')
          .update({ like_count: post.like_count + 1 })
          .eq('id', post.id);
      }
    } catch (err) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, user_has_liked: wasLiked, like_count: post.like_count } : p
        )
      );
    } finally {
      setLikingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !verseRef.trim() || !verseText.trim()) return;
    setSubmitting(true);
    try {
      const authorName = isAnonymous
        ? null
        : user.user_metadata?.full_name?.split(' ')[0] || 'A Believer';

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          verse_ref: verseRef.trim(),
          verse_text: verseText.trim(),
          reflection: reflection.trim() || null,
          is_anonymous: isAnonymous,
          author_name: authorName,
          like_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setPosts((prev) => [{ ...data, user_has_liked: false }, ...prev]);
      setVerseRef('');
      setVerseText('');
      setReflection('');
      setShowCompose(false);
      trackEvent('community_post_shared');
    } catch (err) {
      console.error('Failed to share post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto space-y-8 animate-slide-up-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Community <span className="text-gold-gradient bg-clip-text text-transparent">Feed</span>
          </h1>
          <p className="text-navy-400 text-sm mt-1 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Believers sharing the Word
          </p>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 px-5 py-3 bg-gold-gradient text-navy-950 font-bold rounded-2xl hover:scale-105 transition-all text-sm shadow-lg shadow-gold-400/20"
        >
          <Plus className="w-4 h-4" />
          Share a Verse
        </button>
      </div>

      {/* Compose Panel */}
      {showCompose && (
        <div className="bg-navy-900 border border-gold-400/20 rounded-3xl p-6 space-y-5 animate-slide-up-fade">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Share a Verse with the Community</h3>
            <button onClick={() => setShowCompose(false)} className="text-navy-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={verseRef}
              onChange={(e) => setVerseRef(e.target.value)}
              placeholder="Verse reference (e.g. John 3:16)"
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all placeholder:text-navy-700"
            />
            <textarea
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              placeholder="Verse text..."
              rows={3}
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all resize-none placeholder:text-navy-700"
            />
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Add a reflection or testimony (optional)..."
              rows={2}
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all resize-none placeholder:text-navy-700"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                  isAnonymous
                    ? 'border-navy-600 bg-navy-800 text-navy-300'
                    : 'border-gold-400/30 bg-gold-400/5 text-gold-400'
                }`}
              >
                {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {isAnonymous ? 'Posting anonymously' : 'Posting as yourself'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!verseRef.trim() || !verseText.trim() || submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-navy-950 font-bold rounded-xl text-sm disabled:opacity-50 hover:scale-105 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-gold-400/10 rounded-3xl flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-gold-400/50" />
          </div>
          <p className="text-navy-400 font-bold">Be the first to share!</p>
          <p className="text-navy-600 text-sm">Share a verse that has been on your heart.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-navy-900/40 border border-white/5 rounded-3xl p-6 hover:border-gold-400/10 transition-all"
            >
              {/* Author & time */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gold-400/10 rounded-full flex items-center justify-center border border-gold-400/20">
                    <Cross className="w-4 h-4 text-gold-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {post.is_anonymous ? 'Anonymous Believer' : post.author_name || 'A Believer'}
                    </p>
                    <p className="text-[10px] text-navy-500">{formatTime(post.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Verse */}
              <div className="mb-4">
                <span className="text-[10px] font-black text-gold-400 uppercase tracking-widest">
                  {post.verse_ref}
                </span>
                <blockquote className="mt-2 text-sm text-navy-200 leading-relaxed italic">
                  &ldquo;{post.verse_text}&rdquo;
                </blockquote>
              </div>

              {/* Reflection */}
              {post.reflection && (
                <p className="text-sm text-navy-300 leading-relaxed mb-4 border-l-2 border-gold-400/20 pl-4">
                  {post.reflection}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleLike(post)}
                  disabled={likingId === post.id}
                  className={`flex items-center gap-2 text-xs font-bold transition-all hover:scale-110 active:scale-95 ${
                    post.user_has_liked ? 'text-rose-400' : 'text-navy-500 hover:text-rose-400'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${post.user_has_liked ? 'fill-rose-400' : ''}`}
                  />
                  {post.like_count > 0 && <span>{post.like_count}</span>}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`"${post.verse_text}" — ${post.verse_ref}`);
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-navy-500 hover:text-gold-400 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="py-4 flex items-center justify-center">
            {loadingMore && <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />}
            {!hasMore && posts.length > 0 && (
              <p className="text-xs text-navy-600 font-bold uppercase tracking-widest">
                You've reached the beginning
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Heart, Share2, Plus, X, Loader2, Sparkles, Users, Eye, EyeOff,
  Send, MessageCircle, Image, ChevronDown, ChevronUp, Link2, Check, Trash2,
} from 'lucide-react';
import { trackEvent } from '../../lib/analytics';
import VerseImageModal from '../../components/VerseImageModal';

interface CommunityPost {
  id: string;
  verse_ref: string;
  verse_text: string;
  reflection: string | null;
  is_anonymous: boolean;
  author_name: string | null;
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  author_name: string | null;
  is_anonymous: boolean;
  created_at: string;
}

const PAGE_SIZE = 10;

function SkeletonPost() {
  return (
    <div className="bg-navy-900/40 border border-white/5 rounded-3xl p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-navy-800" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-navy-800 rounded" />
          <div className="h-2.5 w-16 bg-navy-800 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-navy-800 rounded" />
        <div className="h-3 w-4/5 bg-navy-800 rounded" />
        <div className="h-3 w-3/5 bg-navy-800 rounded" />
      </div>
    </div>
  );
}

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
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [imageModalPost, setImageModalPost] = useState<CommunityPost | null>(null);
  const [shareLink, setShareLink] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      const enriched = (data ?? []).map((post: any) => ({ ...post, user_has_liked: false }));
      if (enriched.length > 0) {
        const postIds = enriched.map((p: CommunityPost) => p.id);
        const { data: likes } = await supabase
          .from('community_post_likes').select('post_id')
          .eq('user_id', user.id).in('post_id', postIds);
        const likedSet = new Set((likes ?? []).map((l: any) => l.post_id));
        enriched.forEach((p: CommunityPost) => { p.user_has_liked = likedSet.has(p.id); });
      }
      if (append) setPosts((prev) => [...prev, ...enriched]);
      else setPosts(enriched);
      setHasMore(enriched.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(0); }, [fetchPosts]);

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
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, user_has_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) } : p));
    try {
      if (wasLiked) {
        await supabase.from('community_post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
        await supabase.from('community_posts').update({ like_count: post.like_count - 1 }).eq('id', post.id);
      } else {
        await supabase.from('community_post_likes').insert({ user_id: user.id, post_id: post.id });
        await supabase.from('community_posts').update({ like_count: post.like_count + 1 }).eq('id', post.id);
      }
    } catch {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, user_has_liked: wasLiked, like_count: post.like_count } : p));
    } finally {
      setLikingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !verseRef.trim() || !verseText.trim()) return;
    setSubmitting(true);
    try {
      const authorName = isAnonymous ? null : user.user_metadata?.full_name?.split(' ')[0] || 'A Believer';
      const { data, error } = await supabase
        .from('community_posts')
        .insert({ user_id: user.id, verse_ref: verseRef.trim(), verse_text: verseText.trim(), reflection: reflection.trim() || null, is_anonymous: isAnonymous, author_name: authorName, like_count: 0 })
        .select().single();
      if (error) throw error;
      setPosts((prev) => [{ ...data, user_has_liked: false, comment_count: 0 }, ...prev]);
      setVerseRef(''); setVerseText(''); setReflection(''); setShowCompose(false);
      trackEvent('community_post_shared');
      // Award achievement
      await supabase.rpc('check_and_award_achievements', { p_user_id: user.id });
    } catch (err) {
      console.error('Failed to share post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComments = async (postId: string) => {
    const isOpen = expandedComments.has(postId);
    if (isOpen) {
      setExpandedComments((prev) => { const s = new Set(prev); s.delete(postId); return s; });
      return;
    }
    setExpandedComments((prev) => new Set([...prev, postId]));
    if (comments[postId]) return;
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('community_post_comments').select('*')
        .eq('post_id', postId).order('created_at', { ascending: true });
      if (error) throw error;
      setComments((prev) => ({ ...prev, [postId]: data ?? [] }));
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user || !commentText[postId]?.trim()) return;
    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      const authorName = user.user_metadata?.full_name?.split(' ')[0] || 'A Believer';
      const { data, error } = await supabase
        .from('community_post_comments')
        .insert({ post_id: postId, user_id: user.id, content: commentText[postId].trim(), author_name: authorName, is_anonymous: false })
        .select().single();
      if (error) throw error;
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;
    await supabase.from('community_post_comments').delete().eq('id', commentId).eq('user_id', user.id);
    setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).filter((c) => c.id !== commentId) }));
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: Math.max((p.comment_count || 0) - 1, 0) } : p));
  };

  const handleCreateShareLink = async (post: CommunityPost) => {
    if (!user) return;
    if (shareLink[post.id]) {
      await navigator.clipboard.writeText(shareLink[post.id]);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('shared_verses')
        .insert({ user_id: user.id, verse_ref: post.verse_ref, verse_text: post.verse_text, reflection: post.reflection, theme: 'dark', font_style: 'serif' })
        .select('id').single();
      if (error) throw error;
      const link = `${window.location.origin}/share/${data.id}`;
      setShareLink((prev) => ({ ...prev, [post.id]: link }));
      await navigator.clipboard.writeText(link);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to create share link:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000;
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
            <Users className="w-3.5 h-3.5" /> Believers sharing the Word
          </p>
        </div>
        <button onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 px-5 py-3 bg-gold-gradient text-navy-950 font-bold rounded-2xl hover:scale-105 transition-all text-sm shadow-lg shadow-gold-400/20"
          aria-label="Share a verse">
          <Plus className="w-4 h-4" /> Share a Verse
        </button>
      </div>

      {/* Compose Panel */}
      {showCompose && (
        <div className="bg-navy-900 border border-gold-400/20 rounded-3xl p-6 space-y-5 animate-slide-up-fade" role="form" aria-label="Share verse form">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Share a Verse with the Community</h3>
            <button onClick={() => setShowCompose(false)} className="text-navy-500 hover:text-white transition-colors" aria-label="Close compose">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <input type="text" value={verseRef} onChange={(e) => setVerseRef(e.target.value)}
              placeholder="Verse reference (e.g. John 3:16)" aria-label="Verse reference"
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all placeholder:text-navy-700" />
            <textarea value={verseText} onChange={(e) => setVerseText(e.target.value)}
              placeholder="Verse text..." rows={3} aria-label="Verse text"
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all resize-none placeholder:text-navy-700" />
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)}
              placeholder="Add a reflection or testimony (optional)..." rows={2} aria-label="Reflection"
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all resize-none placeholder:text-navy-700" />
            <div className="flex items-center justify-between">
              <button onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${isAnonymous ? 'border-navy-600 bg-navy-800 text-navy-300' : 'border-gold-400/30 bg-gold-400/5 text-gold-400'}`}>
                {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {isAnonymous ? 'Posting anonymously' : 'Posting as yourself'}
              </button>
              <button onClick={handleSubmit} disabled={!verseRef.trim() || !verseText.trim() || submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-navy-950 font-bold rounded-xl text-sm disabled:opacity-50 hover:scale-105 transition-all">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonPost key={i} />)}
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
        <div className="space-y-4" role="feed" aria-label="Community posts">
          {posts.map((post) => (
            <article key={post.id} className="bg-navy-900/40 border border-white/5 rounded-3xl p-6 hover:border-gold-400/10 transition-all space-y-4">
              {/* Post header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gold-gradient rounded-full flex items-center justify-center text-navy-950 font-bold text-sm flex-shrink-0">
                    {post.is_anonymous ? '?' : (post.author_name?.[0] || 'A')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{post.is_anonymous ? 'Anonymous Believer' : (post.author_name || 'A Believer')}</p>
                    <p className="text-xs text-navy-500">{formatTime(post.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400/50" />
                  <span className="text-xs font-bold text-gold-400/70">{post.verse_ref}</span>
                </div>
              </div>

              {/* Verse text */}
              <blockquote className="text-white/90 text-sm leading-relaxed border-l-2 border-gold-400/30 pl-4 italic">
                "{post.verse_text}"
              </blockquote>

              {/* Reflection */}
              {post.reflection && (
                <p className="text-navy-300 text-sm leading-relaxed">{post.reflection}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => handleLike(post)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${post.user_has_liked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-navy-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent'}`}
                  aria-label={post.user_has_liked ? 'Unlike' : 'Like'} aria-pressed={post.user_has_liked}>
                  <Heart className={`w-3.5 h-3.5 ${post.user_has_liked ? 'fill-current' : ''}`} />
                  {post.like_count}
                </button>

                <button onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-navy-400 hover:text-blue-400 hover:bg-blue-500/5 border border-transparent transition-all"
                  aria-label="Toggle comments" aria-expanded={expandedComments.has(post.id)}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.comment_count || 0}
                </button>

                <button onClick={() => setImageModalPost(post)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-navy-400 hover:text-gold-400 hover:bg-gold-400/5 border border-transparent transition-all"
                  aria-label="Create verse image">
                  <Image className="w-3.5 h-3.5" />
                  Image
                </button>

                <button onClick={() => handleCreateShareLink(post)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-navy-400 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent transition-all ml-auto"
                  aria-label="Copy share link">
                  {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                  {copiedId === post.id ? 'Copied!' : 'Share'}
                </button>
              </div>

              {/* Comments section */}
              {expandedComments.has(post.id) && (
                <div className="border-t border-white/5 pt-4 space-y-3 animate-fade-in">
                  {commentLoading[post.id] ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {(comments[post.id] || []).map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2.5 group">
                          <div className="w-7 h-7 bg-navy-800 rounded-full flex items-center justify-center text-xs font-bold text-navy-300 flex-shrink-0">
                            {comment.is_anonymous ? '?' : (comment.author_name?.[0] || 'A')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-white">{comment.is_anonymous ? 'Anonymous' : (comment.author_name || 'Believer')}</span>
                              <span className="text-[10px] text-navy-600">{formatTime(comment.created_at)}</span>
                            </div>
                            <p className="text-xs text-navy-300 leading-relaxed">{comment.content}</p>
                          </div>
                          {user?.id === comment.user_id && (
                            <button onClick={() => handleDeleteComment(post.id, comment.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-navy-600 hover:text-red-400 transition-all" aria-label="Delete comment">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {(comments[post.id] || []).length === 0 && (
                        <p className="text-xs text-navy-600 text-center py-2">No comments yet. Be the first!</p>
                      )}
                      {/* Add comment */}
                      <div className="flex items-center gap-2 pt-1">
                        <input type="text" value={commentText[post.id] || ''} onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id); } }}
                          placeholder="Add a comment..." aria-label="Add comment"
                          className="flex-1 bg-navy-950/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-400/30 transition-all placeholder:text-navy-700" />
                        <button onClick={() => handleAddComment(post.id)} disabled={!commentText[post.id]?.trim() || commentSubmitting[post.id]}
                          className="p-2 bg-gold-400/10 text-gold-400 rounded-xl hover:bg-gold-400/20 transition-all disabled:opacity-50" aria-label="Submit comment">
                          {commentSubmitting[post.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}

          {/* Load more sentinel */}
          <div ref={loadMoreRef} className="h-4" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6">
              <p className="text-navy-600 text-xs font-bold uppercase tracking-widest">You've reached the beginning</p>
            </div>
          )}
        </div>
      )}

      {/* Verse Image Modal */}
      {imageModalPost && (
        <VerseImageModal
          open={!!imageModalPost}
          onClose={() => setImageModalPost(null)}
          verseRef={imageModalPost.verse_ref}
          verseText={imageModalPost.verse_text}
          reflection={imageModalPost.reflection || undefined}
        />
      )}
    </div>
  );
}

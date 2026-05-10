import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { moderateContent, checkRateLimit } from '../../lib/moderation';
import { RichTextEditor } from '../../components/RichTextEditor';
import {
  MessageCircle,
  Heart,
  Share2,
  Pin,
  Trash2,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Sparkles,
  Flag,
  Eye,
  Loader2,
  X,
  CheckCircle,
  Eye as EyeIcon,
} from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  verse_ref?: string;
  category: string;
  is_pinned: boolean;
  likes_count: number;
  comments_count: number;
  view_count: number;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  is_deleted: boolean;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

type SortBy = 'recent' | 'popular' | 'trending' | 'commented' | 'unanswered';

export default function CommunityForum() {
  const { user, isPro } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [newPostVerse, setNewPostVerse] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [moderationError, setModerationError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 10;

  const categories = [
    { id: 'all', label: 'All Posts' },
    { id: 'general', label: 'General Discussion' },
    { id: 'question', label: 'Questions' },
    { id: 'testimony', label: 'Testimonies' },
    { id: 'prayer', label: 'Prayer Requests' },
    { id: 'study', label: 'Bible Study' },
    { id: 'reflection', label: 'Reflections' },
  ];

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    setCurrentPage(1);
    loadPosts(1);
  }, [sortBy, selectedCategory, searchQuery]);

  const loadPosts = async (page: number) => {
    setLoading(true);
    try {
      let query = supabase
        .from('forum_posts')
        .select('*, profiles(username, avatar_url)', { count: 'exact' })
        .order('is_pinned', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (sortBy === 'popular') {
        query = query.order('likes_count', { ascending: false });
      } else if (sortBy === 'trending') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', oneDayAgo).order('likes_count', { ascending: false });
      } else if (sortBy === 'commented') {
        query = query.order('comments_count', { ascending: false });
      } else if (sortBy === 'unanswered') {
        query = query.eq('comments_count', 0).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const from = (page - 1) * postsPerPage;
      const to = from + postsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setPosts(data || []);
      setTotalPages(Math.ceil((count || 0) / postsPerPage));
    } catch (err) {
      console.error('Failed to load posts:', err);
      showToast('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostTitle.trim() || !newPostContent.trim()) {
      setModerationError('Please fill in title and message');
      return;
    }

    setPosting(true);
    setModerationError('');
    try {
      // Check rate limit
      const rateLimitCheck = await checkRateLimit(user.id, 'post', isPro);
      if (!rateLimitCheck.allowed) {
        setModerationError(rateLimitCheck.message || 'You have reached your daily post limit.');
        setPosting(false);
        return;
      }

      // Run moderation check
      const moderation = await moderateContent(newPostContent, user.id, 'post');
      if (moderation.flagged) {
        setModerationError(moderation.reason || 'Your post contains content that isn\'t allowed on BibleAI. Please review and resubmit.');
        setPosting(false);
        return;
      }

      const { error } = await supabase.from('forum_posts').insert({
        user_id: user.id,
        title: newPostTitle,
        content: newPostContent,
        verse_ref: newPostVerse || null,
        category: newPostCategory,
        is_pinned: false,
        is_flagged: false,
        likes_count: 0,
        comments_count: 0,
        view_count: 0,
      });

      if (error) throw error;

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('general');
      setNewPostVerse('');
      setShowNewPost(false);

      showToast('Post created successfully!');
      await loadPosts();
      trackEvent('forum_post_created', { category: newPostCategory });
    } catch (err) {
      console.error('Failed to create post:', err);
      showToast('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handlePostComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;

    if (newComment.length > 500) {
      showToast('Comment must be less than 500 characters');
      return;
    }

    setPostingComment(true);
    try {
      const { error } = await supabase.from('forum_comments').insert({
        post_id: selectedPost.id,
        user_id: user.id,
        content: newComment,
        likes_count: 0,
        is_deleted: false,
      });

      if (error) throw error;

      // Update post comment count
      await supabase
        .from('forum_posts')
        .update({ comments_count: (selectedPost.comments_count || 0) + 1 })
        .eq('id', selectedPost.id);

      showToast('Comment posted!');
      setNewComment('');
      fetchComments(selectedPost.id);
      trackEvent('forum_comment_posted');
    } catch (err) {
      console.error('Failed to post comment:', err);
      showToast('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ likes_count: currentLikes + 1 })
        .eq('id', postId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post
        )
      );
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('forum_posts').delete().eq('id', postId);

      if (error) throw error;

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      showToast('Post deleted');
      trackEvent('forum_post_deleted');
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast('Failed to delete post');
    }
  };

  const handleFlag = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({ is_flagged: true })
        .eq('id', postId);

      if (error) throw error;

      showToast('Post reported. Thank you for helping keep our community safe.');
      await loadPosts();
      trackEvent('forum_post_flagged');
    } catch (err) {
      console.error('Failed to flag post:', err);
    }
  };

  const handleViewPost = async (post: ForumPost) => {
    // Increment view count
    await supabase
      .from('forum_posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post.id);

    setSelectedPost(post);
    fetchComments(post.id);
  };

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-8 right-8 z-50 px-6 py-3 bg-gold-400 text-navy-950 font-bold rounded-xl shadow-2xl animate-slide-up-fade">
            {toastMessage}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Community Forum</h1>
              <p className="text-navy-400">Ask questions, share testimonies, and pray together</p>
            </div>
            <button
              onClick={() => setShowNewPost(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gold-gradient text-navy-950 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              New Post
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-500" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy-900 border border-navy-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gold-400/20 text-gold-400 border border-gold-400/50'
                    : 'bg-navy-900 text-navy-400 border border-navy-800 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'recent' as const, label: 'Recent', icon: Clock },
              { id: 'popular' as const, label: 'Popular', icon: Eye },
              { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
              { id: 'commented' as const, label: 'Most Commented', icon: MessageCircle },
              { id: 'unanswered' as const, label: 'Unanswered', icon: Sparkles },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSortBy(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  sortBy === id
                    ? 'bg-gold-400/20 text-gold-400 border border-gold-400/50'
                    : 'bg-navy-900 text-navy-400 border border-navy-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* New Post Form */}
        {showNewPost && (
          <div className="mb-6 p-6 bg-navy-900 border border-navy-800 rounded-lg space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Create New Post</h2>
              <button onClick={() => setShowNewPost(false)} className="text-navy-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Title
              </label>
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-2 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gold-400/50"
                >
                  {categories.slice(1).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Verse Reference (Optional)
                </label>
                <input
                  type="text"
                  value={newPostVerse}
                  onChange={(e) => setNewPostVerse(e.target.value)}
                  placeholder="e.g. John 3:16"
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-2 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Message ({newPostContent.length}/2000)
              </label>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value.slice(0, 2000))}
                placeholder="Share your thoughts, questions, or testimonies..."
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 resize-none"
                rows={5}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreatePost}
                disabled={posting || !newPostTitle.trim() || !newPostContent.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Post
              </button>
              <button
                onClick={() => setShowNewPost(false)}
                className="flex-1 px-4 py-2 bg-navy-950 border border-navy-800 text-navy-400 font-bold rounded-lg hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-navy-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No posts found. Be the first to start a discussion!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="p-6 bg-navy-900 border border-navy-800 rounded-lg hover:border-gold-400/30 transition-all group cursor-pointer"
                onClick={() => handleViewPost(post)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gold-400/10 text-gold-400 text-xs font-bold rounded">
                          <Pin className="w-3 h-3" />
                          PINNED
                        </div>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-400/10 text-blue-400 text-xs font-bold rounded">
                        {post.category}
                      </span>
                      {post.is_flagged && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-400/10 text-red-400 text-xs font-bold rounded">
                          <Flag className="w-3 h-3" />
                          Flagged
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-400 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-navy-400">
                      by <span className="text-gold-400">{post.profiles?.username || 'Anonymous'}</span> •{' '}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {user?.id === post.user_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(post.id);
                      }}
                      className="p-2 text-navy-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-navy-200 mb-3 line-clamp-2">{post.content}</p>

                {post.verse_ref && (
                  <div className="mb-3 p-3 bg-navy-950 border border-gold-400/20 rounded-lg text-sm text-gold-400">
                    📖 {post.verse_ref}
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm text-navy-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id, post.likes_count);
                    }}
                    className="flex items-center gap-1 hover:text-red-400 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    {post.likes_count}
                  </button>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {post.view_count}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlag(post.id);
                    }}
                    className="flex items-center gap-1 hover:text-yellow-400 transition-colors ml-auto"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{selectedPost.title}</h2>
              <button onClick={() => setSelectedPost(null)} className="text-navy-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Post Content */}
            <div className="space-y-4 border-b border-navy-800 pb-6">
              <div className="flex items-center gap-2 text-sm text-navy-400">
                <span className="font-medium">{selectedPost.profiles?.username || 'Anonymous'}</span>
                <span>•</span>
                <span>{new Date(selectedPost.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-white whitespace-pre-wrap">{selectedPost.content}</p>
              {selectedPost.verse_ref && (
                <div className="p-3 bg-navy-950 border border-gold-400/20 rounded-lg text-sm text-gold-400">
                  📖 {selectedPost.verse_ref}
                </div>
              )}
              <div className="flex gap-4 text-sm text-navy-500 pt-4">
                <span>{selectedPost.view_count} views</span>
                <span>{selectedPost.likes_count} likes</span>
                <span>{selectedPost.comments_count} comments</span>
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Comments ({comments.length})</h3>

              {loadingComments ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-navy-400 text-sm">No comments yet. Be the first to respond!</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-navy-950 rounded-lg p-3 border border-navy-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {comment.profiles?.username || 'Anonymous'}
                        </span>
                        <span className="text-xs text-navy-600">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-navy-200">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="border-t border-navy-800 pt-6 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                placeholder="Add a comment... (500 chars max)"
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-600">{newComment.length}/500</span>
                <button
                  onClick={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

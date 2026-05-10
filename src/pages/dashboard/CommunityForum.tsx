import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
} from 'lucide-react';

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
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

type SortBy = 'recent' | 'popular' | 'trending';

export default function CommunityForum() {
  const { user } = useAuth();
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

  const categories = [
    { id: 'all', label: 'All Posts' },
    { id: 'general', label: 'General Discussion' },
    { id: 'question', label: 'Questions' },
    { id: 'testimony', label: 'Testimonies' },
    { id: 'prayer', label: 'Prayer Requests' },
  ];

  useEffect(() => {
    loadPosts();
  }, [sortBy, selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forum_posts')
        .select('*, profiles(username, avatar_url)')
        .eq('moderation_status', 'approved')
        .order('is_pinned', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (sortBy === 'popular') {
        query = query.order('likes_count', { ascending: false });
      } else if (sortBy === 'trending') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', oneDayAgo).order('likes_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostTitle.trim() || !newPostContent.trim()) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('forum_posts').insert({
        user_id: user.id,
        title: newPostTitle,
        content: newPostContent,
        verse_ref: newPostVerse || null,
        category: newPostCategory,
        moderation_status: 'pending', // Will be auto-moderated
      });

      if (error) throw error;

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('general');
      setNewPostVerse('');
      setShowNewPost(false);

      // Reload posts
      await loadPosts();
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setPosting(false);
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
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">Community Forum</h1>
              <p className="text-navy-400">Ask questions, share testimonies, and pray together</p>
            </div>
            <button
              onClick={() => setShowNewPost(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all"
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

          <div className="flex gap-2">
            {[
              { id: 'recent' as const, label: 'Recent', icon: Clock },
              { id: 'popular' as const, label: 'Popular', icon: Heart },
              { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSortBy(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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

            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Message
              </label>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your thoughts, questions, or testimonies..."
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 resize-none"
                rows={5}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreatePost}
                disabled={posting || !newPostTitle.trim() || !newPostContent.trim()}
                className="flex-1 px-4 py-2 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {posting ? 'Posting...' : 'Post'}
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
            <div className="text-center py-8 text-navy-400">Loading posts...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-navy-400">No posts found</div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="p-6 bg-navy-900 border border-navy-800 rounded-lg hover:border-gold-400/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {post.is_pinned && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-gold-400/10 text-gold-400 text-xs font-bold rounded mb-2">
                        <Pin className="w-3 h-3" />
                        PINNED
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white mb-1">{post.title}</h3>
                    <p className="text-sm text-navy-400">
                      by <span className="text-gold-400">{post.profiles?.username || 'Anonymous'}</span> •{' '}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {user?.id === post.user_id && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-navy-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-navy-200 mb-3">{post.content}</p>

                {post.verse_ref && (
                  <div className="mb-3 p-3 bg-navy-950 border border-gold-400/20 rounded-lg text-sm text-gold-400">
                    📖 {post.verse_ref}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-navy-400">
                  <button
                    onClick={() => handleLike(post.id, post.likes_count)}
                    className="flex items-center gap-1 hover:text-gold-400 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    {post.likes_count}
                  </button>
                  <button className="flex items-center gap-1 hover:text-gold-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    {post.comments_count}
                  </button>
                  <button className="flex items-center gap-1 hover:text-gold-400 transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

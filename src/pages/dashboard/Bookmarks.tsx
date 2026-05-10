import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Bookmark,
  BookmarkPlus,
  FolderPlus,
  Folder,
  FolderOpen,
  Trash2,
  X,
  Loader2,
  Search,
  Cross,
  Sparkles,
  ChevronRight,
  Edit2,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BookmarkCollection {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface BookmarkItem {
  id: string;
  collection_id: string | null;
  verse_ref: string;
  verse_text: string;
  book_name: string;
  chapter: number;
  verse_number: number;
  translation: string;
  note: string | null;
  created_at: string;
}

const COLLECTION_COLORS = [
  'bg-gold-400/20 text-gold-400 border-gold-400/30',
  'bg-blue-400/20 text-blue-400 border-blue-400/30',
  'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
  'bg-rose-400/20 text-rose-400 border-rose-400/30',
  'bg-purple-400/20 text-purple-400 border-purple-400/30',
  'bg-amber-400/20 text-amber-400 border-amber-400/30',
];

export default function Bookmarks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState(0);
  const [savingCollection, setSavingCollection] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [colRes, bmRes] = await Promise.all([
        supabase
          .from('bookmark_collections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('verse_bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      setCollections((colRes.data as BookmarkCollection[]) ?? []);
      setBookmarks((bmRes.data as BookmarkItem[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createCollection = async () => {
    if (!user || !newCollectionName.trim()) return;
    setSavingCollection(true);
    try {
      const { data, error } = await supabase
        .from('bookmark_collections')
        .insert({
          user_id: user.id,
          name: newCollectionName.trim(),
          color: String(newCollectionColor),
        })
        .select()
        .single();
      if (error) throw error;
      setCollections((prev) => [...prev, data as BookmarkCollection]);
      setNewCollectionName('');
      setShowNewCollection(false);
    } catch (err) {
      console.error('Failed to create collection:', err);
    } finally {
      setSavingCollection(false);
    }
  };

  const deleteBookmark = async (id: string) => {
    setDeletingId(id);
    try {
      await supabase.from('verse_bookmarks').delete().eq('id', id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const deleteCollection = async (id: string) => {
    try {
      await supabase.from('bookmark_collections').delete().eq('id', id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      if (selectedCollection === id) setSelectedCollection(null);
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const navigateToVerse = (bookmark: BookmarkItem) => {
    navigate('/dashboard/bible', {
      state: {
        jumpTo: {
          book: bookmark.book_name,
          chapter: bookmark.chapter,
          verse: bookmark.verse_number,
        },
      },
    });
  };

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesCollection =
      selectedCollection === null || b.collection_id === selectedCollection;
    const matchesSearch =
      !searchQuery ||
      b.verse_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.verse_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCollection && matchesSearch;
  });

  const uncategorizedCount = bookmarks.filter((b) => !b.collection_id).length;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8 animate-slide-up-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Verse <span className="text-gold-gradient bg-clip-text text-transparent">Bookmarks</span>
          </h1>
          <p className="text-navy-400 text-sm mt-1">
            {bookmarks.length} saved verse{bookmarks.length !== 1 ? 's' : ''} across {collections.length} collection{collections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowNewCollection(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gold-gradient text-navy-950 font-bold rounded-2xl hover:scale-105 transition-all text-sm shadow-lg shadow-gold-400/20"
        >
          <FolderPlus className="w-4 h-4" />
          New Collection
        </button>
      </div>

      {/* New Collection Form */}
      {showNewCollection && (
        <div className="bg-navy-900 border border-gold-400/20 rounded-3xl p-6 animate-slide-up-fade">
          <h3 className="text-sm font-bold text-white mb-4">Create New Collection</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name (e.g. Promises, Comfort, Wisdom)"
              className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all placeholder:text-navy-700"
              onKeyDown={(e) => e.key === 'Enter' && createCollection()}
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-navy-500 font-bold uppercase tracking-widest">Color:</span>
              {COLLECTION_COLORS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setNewCollectionColor(i)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${COLLECTION_COLORS[i].split(' ')[0]} ${newCollectionColor === i ? 'scale-125 border-white' : 'border-transparent'}`}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={createCollection}
                disabled={!newCollectionName.trim() || savingCollection}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-navy-950 font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {savingCollection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create
              </button>
              <button
                onClick={() => { setShowNewCollection(false); setNewCollectionName(''); }}
                className="px-5 py-2.5 bg-navy-800 text-navy-300 font-bold rounded-xl text-sm hover:bg-navy-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Collections */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-[10px] font-black text-navy-500 uppercase tracking-widest px-2 mb-3">Collections</p>

          <button
            onClick={() => setSelectedCollection(null)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              selectedCollection === null
                ? 'bg-gold-400/10 text-gold-400 border border-gold-400/20'
                : 'text-navy-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bookmark className="w-4 h-4" />
              All Bookmarks
            </div>
            <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-lg">{bookmarks.length}</span>
          </button>

          {collections.map((col) => {
            const count = bookmarks.filter((b) => b.collection_id === col.id).length;
            const colorClass = COLLECTION_COLORS[parseInt(col.color) ?? 0] ?? COLLECTION_COLORS[0];
            return (
              <div key={col.id} className="group relative">
                <button
                  onClick={() => setSelectedCollection(col.id === selectedCollection ? null : col.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    selectedCollection === col.id
                      ? `${colorClass} border`
                      : 'text-navy-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedCollection === col.id ? (
                      <FolderOpen className="w-4 h-4" />
                    ) : (
                      <Folder className="w-4 h-4" />
                    )}
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-lg">{count}</span>
                </button>
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-navy-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {uncategorizedCount > 0 && (
            <button
              onClick={() => setSelectedCollection('uncategorized')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                selectedCollection === 'uncategorized'
                  ? 'bg-navy-700/50 text-white border border-white/10'
                  : 'text-navy-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4" />
                Uncategorized
              </div>
              <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-lg">{uncategorizedCount}</span>
            </button>
          )}
        </div>

        {/* Main: Bookmarks List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="w-full bg-navy-900/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all placeholder:text-navy-600"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-gold-400/10 rounded-3xl flex items-center justify-center mx-auto">
                <BookmarkPlus className="w-8 h-8 text-gold-400/50" />
              </div>
              <p className="text-navy-400 font-bold">No bookmarks yet</p>
              <p className="text-navy-600 text-sm">
                While reading the Bible, tap the bookmark icon on any verse to save it here.
              </p>
              <button
                onClick={() => navigate('/dashboard/bible')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gold-gradient text-navy-950 font-bold rounded-2xl text-sm hover:scale-105 transition-all"
              >
                <Cross className="w-4 h-4" />
                Open Bible Reader
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookmarks.map((bookmark) => {
                const collection = collections.find((c) => c.id === bookmark.collection_id);
                const colorClass = collection
                  ? COLLECTION_COLORS[parseInt(collection.color) ?? 0] ?? COLLECTION_COLORS[0]
                  : null;
                return (
                  <div
                    key={bookmark.id}
                    className="group bg-navy-900/40 border border-white/5 rounded-3xl p-5 hover:border-gold-400/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-black text-gold-400 uppercase tracking-widest">
                            {bookmark.verse_ref}
                          </span>
                          <span className="text-[10px] text-navy-600 font-bold uppercase">{bookmark.translation}</span>
                          {collection && colorClass && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${colorClass}`}>
                              {collection.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-navy-200 leading-relaxed italic">
                          &ldquo;{bookmark.verse_text}&rdquo;
                        </p>
                        {bookmark.note && (
                          <p className="text-xs text-navy-400 mt-2 font-medium">{bookmark.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => navigateToVerse(bookmark)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-navy-500 hover:text-gold-400 transition-all"
                          title="Open in Bible Reader"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteBookmark(bookmark.id)}
                          disabled={deletingId === bookmark.id}
                          className="opacity-0 group-hover:opacity-100 p-2 text-navy-500 hover:text-red-400 transition-all"
                          title="Remove bookmark"
                        >
                          {deletingId === bookmark.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

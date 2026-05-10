import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Users, Shield, BarChart3, Crown, Ban, Trash2, UserCheck, UserX,
  RefreshCw, Search, Eye, EyeOff, Calendar, TrendingUp, MessageSquare,
  BookOpen, Heart, Loader2, AlertCircle, ChevronDown, ChevronUp,
  Clock, Globe, Lock, LogOut, X, Check, Activity
} from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  is_admin: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  pro_expires_at: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  created_at: string;
}

interface Analytics {
  total_users: number;
  pro_users: number;
  banned_users: number;
  dau: number;
  wau: number;
  mau: number;
  total_prayers: number;
  total_community_posts: number;
  total_chat_messages: number;
  popular_events: { event_name: string; count: number }[];
  new_users_by_day: { date: string; count: number }[];
}

// Admin password — stored in env or hardcoded for demo
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'bibleai-admin-2026';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'users'>('analytics');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [proModal, setProModal] = useState<{ userId: string; email: string } | null>(null);
  const [banModal, setBanModal] = useState<{ userId: string; email: string } | null>(null);
  const [proExpiryDays, setProExpiryDays] = useState('30');
  const [banReason, setBanReason] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePasswordSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Access denied.');
    }
  };

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_analytics' as any, {
        admin_id: user.id,
        days_back: 30,
      });
      if (error) throw error;
      setAnalytics(data as Analytics);
    } catch (err: any) {
      // Fallback: fetch basic stats directly
      try {
        const [usersRes, prayersRes, postsRes, chatsRes] = await Promise.all([
          supabase.from('profiles').select('id, subscription_tier, banned_at', { count: 'exact' }),
          supabase.from('prayer_journal_entries').select('id', { count: 'exact', head: true }),
          supabase.from('community_posts').select('id', { count: 'exact', head: true }),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        ]);
        const allUsers = usersRes.data || [];
        setAnalytics({
          total_users: usersRes.count || 0,
          pro_users: allUsers.filter((u: any) => u.subscription_tier !== 'free').length,
          banned_users: allUsers.filter((u: any) => u.banned_at).length,
          dau: 0, wau: 0, mau: 0,
          total_prayers: prayersRes.count || 0,
          total_community_posts: postsRes.count || 0,
          total_chat_messages: chatsRes.count || 0,
          popular_events: [],
          new_users_by_day: [],
        });
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_tier, is_admin, banned_at, ban_reason, pro_expires_at, last_seen_at, last_ip, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authenticated && user) {
      fetchAnalytics();
      fetchUsers();
    }
  }, [authenticated, user, fetchAnalytics, fetchUsers]);

  const handleSetPro = async () => {
    if (!user || !proModal) return;
    setActionLoading(proModal.userId);
    try {
      const expiresAt = new Date(Date.now() + parseInt(proExpiryDays) * 24 * 60 * 60 * 1000).toISOString();
      await supabase.rpc('admin_set_pro' as any, {
        admin_id: user.id,
        target_user_id: proModal.userId,
        expires_at: expiresAt,
      });
      setUsers((prev) => prev.map((u) => u.id === proModal.userId
        ? { ...u, subscription_tier: 'pro_monthly', pro_expires_at: expiresAt } : u));
      showToast(`Promoted ${proModal.email} to Pro for ${proExpiryDays} days`);
      setProModal(null);
    } catch (err: any) {
      showToast('Failed to promote user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokePro = async (userId: string, email: string) => {
    if (!user) return;
    setActionLoading(userId);
    try {
      await supabase.rpc('admin_revoke_pro' as any, { admin_id: user.id, target_user_id: userId });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, subscription_tier: 'free', pro_expires_at: null } : u));
      showToast(`Revoked Pro from ${email}`);
    } catch {
      showToast('Failed to revoke Pro', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async () => {
    if (!user || !banModal) return;
    setActionLoading(banModal.userId);
    try {
      await supabase.rpc('admin_ban_user' as any, {
        admin_id: user.id,
        target_user_id: banModal.userId,
        reason: banReason || 'Violation of community guidelines',
      });
      setUsers((prev) => prev.map((u) => u.id === banModal.userId
        ? { ...u, banned_at: new Date().toISOString(), ban_reason: banReason } : u));
      showToast(`Banned ${banModal.email}`);
      setBanModal(null);
      setBanReason('');
    } catch {
      showToast('Failed to ban user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId: string, email: string) => {
    if (!user) return;
    setActionLoading(userId);
    try {
      await supabase.rpc('admin_unban_user' as any, { admin_id: user.id, target_user_id: userId });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned_at: null, ban_reason: null } : u));
      showToast(`Unbanned ${email}`);
    } catch {
      showToast('Failed to unban user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!user) return;
    if (!confirm(`PERMANENTLY DELETE ${email}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      // Delete from profiles (cascades to all user data)
      await supabase.from('profiles').delete().eq('id', userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(`Deleted ${email} and all their data`);
    } catch {
      showToast('Failed to delete user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Password Gate ─────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-navy-400 text-sm">This area is restricted. Enter the admin password to continue.</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Admin password"
              className="w-full bg-navy-900 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-red-400/30 transition-all"
              aria-label="Admin password"
            />
            {passwordError && (
              <p className="text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> {passwordError}
              </p>
            )}
            <button onClick={handlePasswordSubmit}
              className="w-full py-3.5 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" /> Enter Admin Panel
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="w-full py-3 text-navy-400 text-sm hover:text-white transition-colors">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[300] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-2 animate-slide-in-right ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-navy-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-white font-bold">Admin Dashboard</h1>
            <p className="text-navy-500 text-xs">BibleAI Control Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { fetchAnalytics(); fetchUsers(); }}
            className="p-2 text-navy-400 hover:text-white transition-colors" aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-navy-400 hover:text-white text-xs font-bold transition-all">
            <LogOut className="w-3.5 h-3.5" /> Exit Admin
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-4">
          {([['analytics', BarChart3, 'Analytics'], ['users', Users, 'Users']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === id ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-navy-400 hover:text-white'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-red-400 animate-spin" /></div>
            ) : analytics ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: analytics.total_users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Pro Members', value: analytics.pro_users, icon: Crown, color: 'text-gold-400', bg: 'bg-gold-400/10' },
                    { label: 'Daily Active', value: analytics.dau, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    { label: 'Weekly Active', value: analytics.wau, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    { label: 'Monthly Active', value: analytics.mau, icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-400/10' },
                    { label: 'Total Prayers', value: analytics.total_prayers, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-400/10' },
                    { label: 'Community Posts', value: analytics.total_community_posts, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Chat Messages', value: analytics.total_chat_messages, icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                    { label: 'Banned Users', value: analytics.banned_users, icon: Ban, color: 'text-red-400', bg: 'bg-red-400/10' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-navy-900/50 border border-white/5 rounded-2xl p-5">
                      <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                      <p className="text-xs text-navy-400 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Popular Events */}
                {analytics.popular_events && analytics.popular_events.length > 0 && (
                  <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-400" /> Popular Events (Last 30 Days)
                    </h3>
                    <div className="space-y-3">
                      {analytics.popular_events.map((ev) => (
                        <div key={ev.event_name} className="flex items-center gap-3">
                          <span className="text-sm text-navy-300 flex-1 font-mono">{ev.event_name}</span>
                          <div className="flex-1 bg-navy-800 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-red-400/60 rounded-full"
                              style={{ width: `${Math.min((ev.count / (analytics.popular_events[0]?.count || 1)) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-white w-12 text-right">{ev.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversion Rate */}
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4">Conversion Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-navy-400 mb-1">Free → Pro Conversion</p>
                      <p className="text-2xl font-bold text-gold-400">
                        {analytics.total_users > 0 ? ((analytics.pro_users / analytics.total_users) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-navy-400 mb-1">Ban Rate</p>
                      <p className="text-2xl font-bold text-red-400">
                        {analytics.total_users > 0 ? ((analytics.banned_users / analytics.total_users) * 100).toFixed(2) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-navy-400">No analytics data available</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full bg-navy-900 border border-white/10 rounded-2xl pl-11 pr-5 py-3 text-sm text-white focus:outline-none focus:border-red-400/30 transition-all"
                aria-label="Search users" />
            </div>

            <p className="text-xs text-navy-500">{filteredUsers.length} users found</p>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-red-400 animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div key={u.id} className={`bg-navy-900/50 border rounded-2xl overflow-hidden transition-all ${u.banned_at ? 'border-red-500/20' : 'border-white/5'}`}>
                    <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.banned_at ? 'bg-red-500/10 text-red-400' : u.subscription_tier !== 'free' ? 'bg-gold-400/10 text-gold-400' : 'bg-navy-800 text-navy-300'}`}>
                        {u.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-white truncate">{u.email}</p>
                          {u.subscription_tier !== 'free' && <span className="text-[9px] font-black uppercase tracking-wider text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-full">PRO</span>}
                          {u.is_admin && <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">ADMIN</span>}
                          {u.banned_at && <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">BANNED</span>}
                        </div>
                        <p className="text-xs text-navy-500">{u.full_name || 'No name'} · Joined {formatDate(u.created_at)}</p>
                      </div>
                      {expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-navy-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-navy-500 flex-shrink-0" />}
                    </div>

                    {expandedUser === u.id && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4 animate-fade-in">
                        {/* User details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-navy-500 mb-0.5">User ID</p>
                            <p className="text-navy-300 font-mono text-[10px] break-all">{u.id}</p>
                          </div>
                          <div>
                            <p className="text-navy-500 mb-0.5">Last IP</p>
                            <p className="text-navy-300 font-mono flex items-center gap-1">
                              <Globe className="w-3 h-3" /> {u.last_ip || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-navy-500 mb-0.5">Last Seen</p>
                            <p className="text-navy-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDate(u.last_seen_at)}
                            </p>
                          </div>
                          <div>
                            <p className="text-navy-500 mb-0.5">Pro Expires</p>
                            <p className="text-navy-300">{formatDate(u.pro_expires_at)}</p>
                          </div>
                          {u.ban_reason && (
                            <div className="col-span-2">
                              <p className="text-navy-500 mb-0.5">Ban Reason</p>
                              <p className="text-red-300">{u.ban_reason}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* Pro management */}
                          {u.subscription_tier === 'free' ? (
                            <button onClick={() => setProModal({ userId: u.id, email: u.email })}
                              disabled={actionLoading === u.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-400/10 text-gold-400 text-xs font-bold hover:bg-gold-400/20 transition-all disabled:opacity-50">
                              {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                              Promote to Pro
                            </button>
                          ) : (
                            <button onClick={() => handleRevokePro(u.id, u.email)}
                              disabled={actionLoading === u.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/10 text-amber-400 text-xs font-bold hover:bg-amber-400/20 transition-all disabled:opacity-50">
                              {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                              Revoke Pro
                            </button>
                          )}

                          {/* Ban/Unban */}
                          {!u.banned_at ? (
                            <button onClick={() => setBanModal({ userId: u.id, email: u.email })}
                              disabled={actionLoading === u.id || u.is_admin}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50">
                              <Ban className="w-3.5 h-3.5" /> Ban User
                            </button>
                          ) : (
                            <button onClick={() => handleUnban(u.id, u.email)}
                              disabled={actionLoading === u.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                              <UserCheck className="w-3.5 h-3.5" /> Unban
                            </button>
                          )}

                          {/* Delete */}
                          {!u.is_admin && (
                            <button onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={actionLoading === u.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/30 text-red-500 text-xs font-bold hover:bg-red-900/50 transition-all disabled:opacity-50 ml-auto">
                              <Trash2 className="w-3.5 h-3.5" /> Delete User
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pro Modal */}
      {proModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-navy-900 border border-gold-400/20 rounded-3xl p-6 w-full max-w-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><Crown className="w-4 h-4 text-gold-400" /> Promote to Pro</h3>
              <button onClick={() => setProModal(null)} className="text-navy-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-navy-400">Promoting <span className="text-white font-bold">{proModal.email}</span></p>
            <div>
              <label className="text-xs text-navy-400 block mb-2">Duration (days)</label>
              <input type="number" value={proExpiryDays} onChange={(e) => setProExpiryDays(e.target.value)} min="1"
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-400/30" />
              <div className="flex gap-2 mt-2">
                {['7', '30', '90', '365'].map((d) => (
                  <button key={d} onClick={() => setProExpiryDays(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${proExpiryDays === d ? 'bg-gold-400/20 text-gold-400' : 'bg-navy-800 text-navy-400 hover:text-white'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-navy-400 text-sm font-bold hover:text-white transition-all">Cancel</button>
              <button onClick={handleSetPro} disabled={actionLoading === proModal.userId}
                className="flex-1 py-3 rounded-xl bg-gold-gradient text-navy-950 font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === proModal.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                Promote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-navy-900 border border-red-500/20 rounded-3xl p-6 w-full max-w-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><Ban className="w-4 h-4 text-red-400" /> Ban User</h3>
              <button onClick={() => setBanModal(null)} className="text-navy-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-navy-400">Banning <span className="text-white font-bold">{banModal.email}</span></p>
            <div>
              <label className="text-xs text-navy-400 block mb-2">Reason (optional)</label>
              <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3}
                placeholder="Violation of community guidelines..."
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-400/30 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-navy-400 text-sm font-bold hover:text-white transition-all">Cancel</button>
              <button onClick={handleBan} disabled={actionLoading === banModal.userId}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === banModal.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

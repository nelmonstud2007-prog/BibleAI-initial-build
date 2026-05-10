import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User as UserIcon,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Save,
  Loader2,
  Upload,
  X,
  Check,
  AlertCircle,
  BarChart3,
  Crown,
  Settings as SettingsIcon,
} from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

type SettingsTab = 'profile' | 'privacy' | 'subscription' | 'usage' | 'advanced';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  email: string;
  username_changed_at: string;
  avatar_changed_count: number;
  avatar_change_reset_at: string;
  is_suspended: boolean;
}

export default function SettingsV2() {
  const { user, isPro } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Privacy form state
  const [showProfile, setShowProfile] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [allowDMs, setAllowDMs] = useState(true);

  // Advanced form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data);
        setBio(data.bio || '');
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setAvatarPreview(data.avatar_url || null);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const checkUsernameAvailability = async (value: string) => {
    if (value.length < 3 || value.length > 20) {
      setUsernameAvailable(null);
      return;
    }
    if (value === profile?.username) {
      setUsernameAvailable(true);
      return;
    }
    setCheckingUsername(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.toLowerCase())
        .maybeSingle();
      setUsernameAvailable(!data);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    setUsername(cleaned);
    checkUsernameAvailability(cleaned);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!user || !avatarPreview || avatarPreview === profile?.avatar_url) return;
    setSaving(true);
    try {
      const now = new Date();
      const resetDate = profile?.avatar_change_reset_at ? new Date(profile.avatar_change_reset_at) : new Date();
      if (now < resetDate && (profile?.avatar_changed_count || 0) >= 3) {
        showToast('You can only change your avatar 3 times per 7 days', 'error');
        setSaving(false);
        return;
      }

      const base64Data = avatarPreview.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      const fileName = `${user.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/${fileName}`, blob, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(`${user.id}/${fileName}`);

      const newResetDate = new Date();
      if (!resetDate || now >= resetDate) {
        newResetDate.setDate(newResetDate.getDate() + 7);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl.publicUrl,
          avatar_changed_count: (profile?.avatar_changed_count || 0) + 1,
          avatar_change_reset_at: newResetDate.toISOString(),
        })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl.publicUrl } : null);
      showToast('Profile picture updated successfully');
      trackEvent('avatar_updated');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      showToast('Failed to upload avatar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveProfileChanges = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (username !== profile?.username) {
        const lastChange = profile?.username_changed_at ? new Date(profile.username_changed_at) : null;
        const now = new Date();
        if (lastChange) {
          const daysSinceChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceChange < 7) {
            showToast(`You can change your username again in ${Math.ceil(7 - daysSinceChange)} days`, 'error');
            setSaving(false);
            return;
          }
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          bio: bio.slice(0, 160),
          full_name: fullName,
          username: username.toLowerCase(),
          username_changed_at: username !== profile?.username ? new Date().toISOString() : profile?.username_changed_at,
        })
        .eq('id', user.id);
      if (error) throw error;

      setProfile(prev => prev ? { ...prev, bio, full_name: fullName, username } : null);
      showToast('Profile updated successfully');
      trackEvent('profile_updated');
    } catch (err) {
      console.error('Profile update failed:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      showToast('Privacy settings updated');
      trackEvent('privacy_settings_updated');
    } catch (err) {
      console.error('Privacy update failed:', err);
      showToast('Failed to update privacy settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully');
      trackEvent('password_changed');
    } catch (err) {
      console.error('Password change failed:', err);
      showToast('Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted after 30 days.'
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: true, updated_at: new Date().toISOString() })
        .eq('id', user!.id);
      if (error) throw error;

      await supabase.auth.signOut();
      showToast('Account deletion initiated. You will be signed out.');
      trackEvent('account_deleted');
    } catch (err) {
      console.error('Account deletion failed:', err);
      showToast('Failed to delete account', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {toastMessage && (
          <div className={`fixed top-8 right-8 z-[100] px-6 py-3 rounded-2xl font-bold shadow-2xl animate-slide-up-fade ${
            toastType === 'success' ? 'bg-emerald-400 text-navy-950' : 'bg-red-500 text-white'
          }`}>
            {toastMessage}
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white">Settings</h1>
          <p className="text-navy-400">Manage your account, privacy, and preferences</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-4 space-y-2 sticky top-20">
              {[
                { id: 'profile' as const, label: 'Profile', icon: UserIcon },
                { id: 'privacy' as const, label: 'Privacy', icon: Shield },
                { id: 'subscription' as const, label: 'Subscription', icon: Crown },
                { id: 'usage' as const, label: 'Usage', icon: BarChart3 },
                { id: 'advanced' as const, label: 'Advanced', icon: SettingsIcon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    activeTab === id
                      ? 'bg-gold-400/10 text-gold-400 border border-gold-400/20'
                      : 'text-navy-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-white mb-6">Profile Picture</h2>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-32 h-32 bg-gold-gradient rounded-2xl flex items-center justify-center text-4xl font-black text-navy-950 flex-shrink-0">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        profile?.full_name?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-gold-400 text-navy-950 font-bold rounded-xl hover:bg-gold-300 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Choose Image
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                      <p className="text-xs text-navy-400">JPG, PNG, or WebP. Max 2MB.</p>
                      <p className="text-xs text-navy-500">
                        Changes remaining: {3 - (profile?.avatar_changed_count || 0)}/3 this week
                      </p>
                      {avatarPreview !== profile?.avatar_url && (
                        <button
                          onClick={uploadAvatar}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-bold rounded-xl hover:bg-emerald-400/20 transition-all disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save Avatar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-8 space-y-6">
                  <h2 className="text-xl font-bold text-white">Profile Information</h2>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy-300">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-4 pr-10 py-3 text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                        placeholder="your_username"
                      />
                      {checkingUsername && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-navy-400" />}
                      {!checkingUsername && usernameAvailable === true && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />}
                      {!checkingUsername && usernameAvailable === false && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                    </div>
                    <p className="text-xs text-navy-500">3–20 characters. Can be changed once every 7 days.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy-300">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 160))}
                      maxLength={160}
                      className="w-full bg-white/[0.03] border border-white/8 rounded-xl p-4 text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all resize-none"
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                    <p className="text-xs text-navy-500">{bio.length}/160 characters</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy-300">Full Name (Private)</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                      placeholder="Your real name"
                    />
                    <p className="text-xs text-navy-500">Never shown publicly. Visible to admins only.</p>
                  </div>

                  <button
                    onClick={saveProfileChanges}
                    disabled={saving || usernameAvailable === false}
                    className="flex items-center gap-2 px-6 py-3 bg-gold-400 text-navy-950 font-bold rounded-xl hover:bg-gold-300 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-8 space-y-6">
                  <h2 className="text-xl font-bold text-white">Privacy Settings</h2>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="font-medium text-white">Show my profile to other users</p>
                      <p className="text-xs text-navy-400 mt-1">Others can view your username, bio, and avatar</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showProfile}
                        onChange={(e) => setShowProfile(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="font-medium text-white">Show my activity</p>
                      <p className="text-xs text-navy-400 mt-1">Others can see your last active time and posts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showActivity}
                        onChange={(e) => setShowActivity(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="font-medium text-white">Allow direct messages</p>
                      <p className="text-xs text-navy-400 mt-1">Users can send you private messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDMs}
                        onChange={(e) => setAllowDMs(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-400/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400" />
                    </label>
                  </div>

                  <button
                    onClick={savePrivacySettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gold-400 text-navy-950 font-bold rounded-xl hover:bg-gold-300 transition-all disabled:opacity-50 w-full sm:w-auto"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Privacy Settings
                  </button>

                  <div className="border-t border-white/10 pt-6 mt-6">
                    <h3 className="font-bold text-white mb-4">Data & Account</h3>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white border border-white/10 font-bold rounded-xl hover:bg-white/10 transition-all">
                      <Download className="w-4 h-4" />
                      Download My Data (JSON)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-8 space-y-6">
                <h2 className="text-xl font-bold text-white">Your Plan</h2>
                <div className={`p-6 rounded-xl border-2 ${isPro ? 'bg-gold-400/10 border-gold-400/30' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Crown className={`w-6 h-6 ${isPro ? 'text-gold-400' : 'text-navy-400'}`} />
                      <span className={`text-2xl font-black ${isPro ? 'text-gold-400' : 'text-white'}`}>
                        {isPro ? 'Pro' : 'Free'} Plan
                      </span>
                    </div>
                    <button className="px-6 py-2 bg-gold-400 text-navy-950 font-bold rounded-xl hover:bg-gold-300 transition-all">
                      {isPro ? 'Manage' : 'Upgrade'}
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {isPro ? (
                      <>
                        <p className="text-navy-300">Unlimited Bible Chat messages</p>
                        <p className="text-navy-300">Unlimited verse rerolls</p>
                        <p className="text-navy-300">Voice playback for verses</p>
                        <p className="text-navy-300">Priority support</p>
                      </>
                    ) : (
                      <>
                        <p className="text-navy-300">3 Bible Chat messages per day</p>
                        <p className="text-navy-300">3 verse rerolls per day</p>
                        <p className="text-navy-300">No voice playback</p>
                        <p className="text-navy-300">Community support</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-6">
                <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-8 space-y-6">
                  <h2 className="text-xl font-bold text-white">Usage Statistics</h2>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">Bible Chat Messages</p>
                      <p className="text-sm text-navy-400">5 / {isPro ? '∞' : '3'}</p>
                    </div>
                    <div className="w-full bg-navy-950 rounded-full h-2">
                      <div className="bg-gold-400 h-2 rounded-full" style={{ width: isPro ? '100%' : '66%' }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">Verse Rerolls Today</p>
                      <p className="text-sm text-navy-400">2 / {isPro ? '∞' : '3'}</p>
                    </div>
                    <div className="w-full bg-navy-950 rounded-full h-2">
                      <div className="bg-emerald-400 h-2 rounded-full" style={{ width: isPro ? '100%' : '66%' }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">Saved Verses</p>
                      <p className="text-sm text-navy-400">24</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">Journal Entries</p>
                      <p className="text-sm text-navy-400">8</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white">Community Forum Posts</p>
                      <p className="text-sm text-navy-400">3</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-8 space-y-6">
                  <h2 className="text-xl font-bold text-white">Change Password</h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-navy-300">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-4 pr-10 py-3 text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-600 hover:text-navy-300 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-navy-300">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-4 pr-10 py-3 text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/40 focus:bg-white/[0.05] transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-600 hover:text-navy-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={changePassword}
                      disabled={saving || !newPassword || !confirmPassword}
                      className="flex items-center gap-2 px-6 py-3 bg-gold-400 text-navy-950 font-bold rounded-xl hover:bg-gold-300 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
                  </div>
                  <p className="text-sm text-red-300">These actions cannot be undone.</p>
                  <button
                    onClick={deleteAccount}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

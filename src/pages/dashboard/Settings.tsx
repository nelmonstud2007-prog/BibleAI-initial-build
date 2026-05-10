import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User as UserIcon,
  Bell,
  Shield,
  Save,
  Crown,
  Check,
  Sparkles,
  Loader2,
  ChevronRight,
  Mail,
  Clock,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import UpgradeModal from '../../components/UpgradeModal';
import { trackEvent } from '../../lib/analytics';

export default function Settings() {
  const { user, isPro, subscriptionTier } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState('08:00');
  const [toastMessage, setToastMessage] = useState('');

  const userInitial = fullName ? fullName.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || '?');

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, daily_reminder_enabled, daily_reminder_time')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.error('Failed to load settings:', error);
      return;
    }

    if (data?.full_name) setFullName(data.full_name);
    setDailyReminderEnabled(Boolean(data?.daily_reminder_enabled));
    setDailyReminderTime(data?.daily_reminder_time?.slice(0, 5) || '08:00');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        daily_reminder_enabled: dailyReminderEnabled,
        daily_reminder_time: dailyReminderEnabled ? `${dailyReminderTime}:00` : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) {
      console.error('Failed to save settings:', error);
      setSaving(false);
      showToast('Failed to save settings');
      return;
    }
    setSaving(false);
    setSaved(true);
    showToast('Daily reminder settings saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const subscribeToWebPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return; // VAPID not configured yet
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      // Store subscription in Supabase for server-side push delivery
      await supabase.from('push_subscriptions').upsert({
        user_id: user!.id,
        endpoint: sub.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('Web Push subscription failed:', err);
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setDailyReminderEnabled(false);
          showToast('Notification permission denied');
          return;
        }
      }
      if (Notification.permission === 'denied') {
        setDailyReminderEnabled(false);
        showToast('Please enable notifications in your browser settings');
        return;
      }
      // Register Web Push subscription
      await subscribeToWebPush();
      showToast('Push notifications enabled!');
    }
    setDailyReminderEnabled(enabled);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto space-y-10 animate-slide-up-fade">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      
      {toastMessage && (
        <div className="fixed top-8 right-8 z-[100] bg-emerald-400 text-navy-950 px-6 py-3 rounded-2xl font-bold shadow-2xl animate-slide-up-fade">
          {toastMessage}
        </div>
      )}

      {/* Header & Profile Summary */}
      <div className="flex flex-col sm:flex-row items-center gap-8 bg-navy-900/40 border border-white/5 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-gold-400/10 transition-all duration-700" />
        
        <div className="relative">
          <div className="w-24 h-24 bg-gold-gradient rounded-[2rem] flex items-center justify-center text-3xl font-black text-navy-950 shadow-2xl shadow-gold-400/20 group-hover:scale-105 transition-transform duration-500">
            {userInitial}
          </div>
          {isPro && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-navy-950 border-4 border-navy-900 rounded-full flex items-center justify-center text-gold-400 shadow-xl">
              <Crown className="w-5 h-5 fill-gold-400" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight">{fullName || 'Spiritual Journeyer'}</h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
             <div className="flex items-center gap-2 text-sm text-navy-400 font-medium bg-navy-950/50 px-3 py-1.5 rounded-xl border border-white/5">
                <Mail className="w-4 h-4 text-gold-400" />
                {user?.email}
             </div>
             <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
               isPro ? 'bg-gold-400/10 text-gold-400 border-gold-400/20' : 'bg-navy-800 text-navy-500 border-navy-700'
             }`}>
                {isPro ? 'Pro Member' : 'Free Plan'}
             </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Plan & Security */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Subscription Section */}
          <div className="bg-navy-900/40 border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gold-400/10 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5 text-gold-400" />
                 </div>
                 <h2 className="text-lg font-bold text-white">Your Plan</h2>
              </div>
              <button 
                onClick={() => setShowUpgrade(true)}
                className="text-xs font-bold text-gold-400 hover:text-white transition-colors flex items-center gap-1.5 group"
              >
                {isPro ? 'Manage Details' : 'Upgrade Options'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {isPro ? (
              <div className="relative bg-navy-950/50 border border-gold-400/20 rounded-[1.5rem] p-6 group">
                <div className="absolute top-0 right-0 p-4">
                   <Sparkles className="w-5 h-5 text-gold-400/30 animate-pulse" />
                </div>
                <p className="text-sm text-navy-300 leading-relaxed">
                   You are currently on <span className="text-gold-400 font-bold uppercase tracking-widest text-[11px]">{subscriptionTier?.replace('_', ' ')}</span>.
                   Enjoy unlimited AI chat, prayer history, and deep spiritual analytics.
                </p>
                <div className="mt-6 flex items-center gap-4 text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">
                   <Check className="w-4 h-4" />
                   Status: Active & Protected
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gold-gradient rounded-[1.5rem] p-8 text-navy-950 shadow-2xl shadow-gold-400/10">
                   <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                     BibleAI Pro
                     <Sparkles className="w-6 h-6" />
                   </h3>
                   <p className="text-navy-950/80 font-bold text-sm mb-6">Unlock the full spiritual dimension of BibleAI.</p>
                   <ul className="space-y-3 mb-8">
                      {['Unlimited AI Biblical Insights', 'Infinite Prayer Journal History', 'Prayer Analytics & Trends', 'Early Access to New Features'].map(item => (
                        <li key={item} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                           <Check className="w-4 h-4" />
                           {item}
                        </li>
                      ))}
                   </ul>
                   <button 
                     onClick={() => setShowUpgrade(true)}
                     className="w-full bg-navy-950 text-white font-black py-4 rounded-2xl hover:bg-navy-900 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
                   >
                     Get Started &bull; $4.99/mo
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Security & Data */}
          <div className="bg-navy-900/40 border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-purple-400/10 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
               </div>
               <h2 className="text-lg font-bold text-white">Security & Data</h2>
            </div>
            <p className="text-sm text-navy-400 leading-relaxed">
              Your spiritual journey is deeply personal. BibleAI uses enterprise-grade encryption and 
              Row Level Security (RLS) to ensure that only you can ever access your prayers and reflections.
            </p>
            <div className="flex items-center justify-between p-4 bg-navy-950/50 border border-white/5 rounded-2xl">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-400/10 rounded-lg flex items-center justify-center">
                     <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Database Privacy</span>
               </div>
               <span className="text-[10px] font-black text-navy-500 uppercase tracking-widest">Active</span>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Profile Edit Section */}
          <div className="bg-navy-900/40 border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-400/10 rounded-xl flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-blue-400" />
               </div>
               <h2 className="text-lg font-bold text-white">Profile Details</h2>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-gold-400/30 focus:ring-4 focus:ring-gold-400/5 transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2">Registered Email</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-navy-950/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-navy-500 cursor-not-allowed italic"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Shield className="w-4 h-4 text-navy-700" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Synchronizing...' : saved ? 'Successfully Saved' : 'Update Profile'}
              </button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-navy-900/40 border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-400" />
               </div>
               <h2 className="text-lg font-bold text-white">Notifications</h2>
            </div>

            <div className="space-y-6">
               <div className="flex items-center justify-between p-2">
                  <div className="space-y-1">
                     <p className="text-sm font-bold text-white">Daily Prayer Reminder</p>
                     <p className="text-[10px] text-navy-500 font-medium uppercase tracking-widest">Built-in accountability</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={dailyReminderEnabled}
                      onChange={(e) => void handleReminderToggle(e.target.checked)}
                    />
                    <div className="w-12 h-6 bg-navy-800 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-400 shadow-inner" />
                  </label>
               </div>

               {dailyReminderEnabled && (
                 <div className="space-y-2 animate-slide-up-fade">
                    <label className="text-[10px] font-black text-navy-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                       <Clock className="w-3 h-3" />
                       Preferred Time
                    </label>
                    <input
                      type="time"
                      value={dailyReminderTime}
                      onChange={(e) => setDailyReminderTime(e.target.value)}
                      className="w-full bg-navy-950/50 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-gold-400/30 transition-all"
                    />
                 </div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

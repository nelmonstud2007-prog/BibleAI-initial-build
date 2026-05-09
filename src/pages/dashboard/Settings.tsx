import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Bell,
  Shield,
  Save,
  Crown,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react';
import UpgradeModal from '../../components/UpgradeModal';
import { trackEvent } from '../../lib/analytics';
import { useEffect } from 'react';

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
    }
    setDailyReminderEnabled(enabled);
  };

  const handleManageSubscription = async () => {
    // For now, open the upgrade modal. In production, this would redirect
    // to Stripe Customer Portal for managing existing subscriptions.
    setCheckoutLoading(true);
    setShowUpgrade(true);
    setTimeout(() => setCheckoutLoading(false), 400);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 px-4 py-2 rounded-xl text-sm shadow-lg">
          {toastMessage}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-navy-300">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Subscription */}
        <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Crown className="w-5 h-5 text-gold-400" />
            <h2 className="text-base font-semibold text-white">Subscription</h2>
          </div>

          {isPro ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-gold-400 bg-gold-400/10 px-2.5 py-1 rounded-lg">
                    <Crown className="w-3.5 h-3.5" />
                    PRO
                  </span>
                </div>
                <p className="text-sm text-navy-300">
                  You have access to all Pro features including unlimited AI chat, unlimited prayers, and analytics.
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={checkoutLoading}
                className="text-sm text-navy-300 hover:text-white border border-navy-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
              >
                {checkoutLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening...
                  </span>
                ) : (
                  'Manage'
                )}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-navy-300 bg-navy-800 px-2.5 py-1 rounded-lg">
                  Free Plan
                </span>
              </div>

              {/* Plan comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-3">Free</p>
                  <ul className="space-y-2">
                    {[
                      '5 AI messages/day',
                      'Up to 10 prayers',
                      'Daily verse & devotional',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-navy-300">
                        <span className="w-1 h-1 bg-navy-500 rounded-full mt-1.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gold-400/5 border border-gold-400/20 rounded-xl p-4 relative">
                  <div className="absolute -top-2 right-3 bg-gold-400 text-navy-950 text-[9px] font-bold px-2 py-0.5 rounded-md">
                    RECOMMENDED
                  </div>
                  <p className="text-sm font-semibold text-gold-400 mb-3">Pro</p>
                  <ul className="space-y-2">
                    {[
                      'Unlimited AI chat',
                      'Unlimited prayer journal',
                      'Prayer analytics',
                      'Priority responses',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-navy-200">
                        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-navy-800/50 border border-navy-700 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">$4.99</p>
                  <p className="text-xs text-navy-400">/month</p>
                </div>
                <div className="flex-1 bg-gold-400/5 border border-gold-400/20 rounded-xl p-3 text-center relative">
                  <span className="absolute -top-2 right-2 bg-emerald-400 text-navy-950 text-[8px] font-bold px-1.5 py-0.5 rounded">
                    SAVE 33%
                  </span>
                  <p className="text-lg font-bold text-white">$39.99</p>
                  <p className="text-xs text-navy-400">/year</p>
                </div>
              </div>

              <button
                onClick={() => {
                  trackEvent('upgrade_button_clicked', { source: 'settings_page' });
                  setShowUpgrade(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-semibold py-3 rounded-xl hover:bg-gold-300 transition-colors shadow-lg shadow-gold-400/20"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-gold-400" />
            <h2 className="text-base font-semibold text-white">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-navy-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder-navy-400 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gold-400 text-navy-950 font-semibold px-6 py-2.5 rounded-xl hover:bg-gold-300 transition-colors text-sm disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-gold-400" />
            <h2 className="text-base font-semibold text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-white">Daily Prayer Reminder</p>
                <p className="text-xs text-navy-400">Receive a daily reminder at your chosen time</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={dailyReminderEnabled}
                  onChange={(e) => {
                    void handleReminderToggle(e.target.checked);
                  }}
                />
                <div className="w-11 h-6 bg-navy-700 rounded-full peer-checked:bg-gold-400 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
            {dailyReminderEnabled && (
              <div>
                <label className="block text-sm font-medium text-navy-200 mb-1.5">Reminder Time</label>
                <input
                  type="time"
                  value={dailyReminderTime}
                  onChange={(e) => setDailyReminderTime(e.target.value)}
                  className="w-full sm:w-56 bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Security */}
        <div className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5 text-gold-400" />
            <h2 className="text-base font-semibold text-white">Security</h2>
          </div>
          <div>
            <p className="text-sm text-navy-300 mb-3">Your data is protected with Supabase Row Level Security. Only you can access your prayers, reflections, and chat history.</p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2 w-fit">
              <Shield className="w-3.5 h-3.5" />
              RLS Enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, Loader2, Sparkles, ArrowRight, Shield, MessageSquare, BookOpen, BarChart3, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { SubscriptionTier } from '../context/AuthContext';

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Pro Monthly',
  yearly: 'Pro Yearly',
};

const PLAN_TIER_MAP: Record<string, SubscriptionTier> = {
  monthly: 'pro_monthly',
  yearly: 'pro_yearly',
};

const MAX_POLLS = 20;
const POLL_MS   = 2500;

const PRO_FEATURES = [
  { icon: MessageSquare, label: 'Unlimited AI Bible Chat' },
  { icon: BookOpen,      label: 'Unlimited prayer entries' },
  { icon: BarChart3,     label: 'Prayer analytics & insights' },
  { icon: Sparkles,      label: 'Priority AI responses' },
  { icon: Calendar,      label: 'Daily devotional archive' },
];

export default function UpgradeSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscriptionTier, refreshProfile, refreshLimits } = useAuth();

  const plan = searchParams.get('plan') ?? 'monthly';
  const planLabel = PLAN_LABELS[plan] ?? 'Pro';
  const expectedTier = PLAN_TIER_MAP[plan] ?? 'pro_monthly';

  const [confirmed, setConfirmed] = useState(false);
  const [polling, setPolling] = useState(true);
  const [polls, setPolls] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate content in after mount
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 150);
    return () => clearTimeout(t);
  }, []);

  // If already upgraded before page even loaded
  useEffect(() => {
    if (subscriptionTier === expectedTier) {
      setConfirmed(true);
      setPolling(false);
    }
  }, [subscriptionTier, expectedTier]);

  // Polling — uses refreshProfile's RETURN VALUE (not stale closure state)
  const startPolling = useCallback(async () => {
    if (!user || confirmed) return;

    let count = 0;

    intervalRef.current = setInterval(async () => {
      count++;
      setPolls(count);

      if (count >= MAX_POLLS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPolling(false);
        return;
      }

      // refreshProfile now RETURNS the fresh tier directly
      const freshTier = await refreshProfile();

      if (freshTier === expectedTier) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setConfirmed(true);
        setPolling(false);
        void refreshLimits();
      }
    }, POLL_MS);
  }, [user, confirmed, expectedTier, refreshProfile]);

  useEffect(() => {
    if (user && !confirmed) {
      startPolling();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id, confirmed, startPolling]);

  const progressPct = Math.min((polls / MAX_POLLS) * 100, 100);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold-400/[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gold-400/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className={`max-w-lg w-full relative z-10 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Main Card */}
        <div className="bg-navy-900/60 backdrop-blur-sm border border-navy-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">

          {/* Crown Icon */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-700 delay-300 ${
              confirmed
                ? 'bg-emerald-400/10 border-2 border-emerald-400/30'
                : 'bg-gold-400/10 border-2 border-gold-400/20 animate-pulse-gold'
            }`}>
              {confirmed ? (
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              ) : (
                <Crown className="w-10 h-10 text-gold-400" />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
            {confirmed ? 'You\'re All Set!' : 'Welcome to Pro! 🎉'}
          </h1>
          <p className="text-sm text-navy-300 text-center mb-8">
            Your <span className="text-gold-400 font-semibold">{planLabel}</span> subscription
            {confirmed ? ' is active.' : ' is being activated.'}
          </p>

          {/* Status Indicator */}
          <div className="mb-8">
            {confirmed ? (
              <div className="flex items-center justify-center gap-2.5 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm font-medium text-emerald-400">
                  Subscription confirmed — account upgraded!
                </span>
              </div>
            ) : polling ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-gold-400 flex-shrink-0" />
                  <span className="text-sm text-navy-300">
                    Activating your subscription&hellip;
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold-400 to-gold-300 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2.5 bg-navy-800/50 border border-navy-700 rounded-xl px-4 py-3">
                <Shield className="w-4 h-4 text-navy-400 flex-shrink-0" />
                <span className="text-sm text-navy-400">
                  Processing — your upgrade will appear shortly.
                </span>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="space-y-2.5 mb-8">
            <p className="text-[10px] font-bold text-navy-500 uppercase tracking-widest mb-3">What&apos;s unlocked</p>
            {PRO_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="flex items-center gap-3 bg-navy-800/30 border border-navy-800/50 rounded-xl px-4 py-3 transition-all duration-500"
                  style={{
                    transitionDelay: `${300 + i * 80}ms`,
                    opacity: showContent ? 1 : 0,
                    transform: showContent ? 'translateX(0)' : 'translateX(-12px)',
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gold-400" />
                  </div>
                  <span className="text-sm text-navy-200 font-medium">{f.label}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60 ml-auto flex-shrink-0" />
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gold-400 text-navy-950 font-semibold py-3.5 rounded-xl hover:bg-gold-300 transition-all shadow-lg shadow-gold-400/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle footer text */}
        <p className="text-center text-[11px] text-navy-600 mt-4">
          Having trouble? Email <a href="mailto:bibleaisupportcontact@gmail.com" className="text-navy-400 hover:text-white transition-colors underline">support</a>
        </p>
      </div>
    </div>
  );
}

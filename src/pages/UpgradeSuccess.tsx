import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, Loader2, Sparkles } from 'lucide-react';
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

const MAX_POLLS = 15;
const POLL_MS = 2000;

export default function UpgradeSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscriptionTier, refreshProfile } = useAuth();

  const plan = searchParams.get('plan') ?? 'monthly';
  const planLabel = PLAN_LABELS[plan] ?? 'Pro';
  const expectedTier = PLAN_TIER_MAP[plan] ?? 'pro_monthly';

  const [confirmed, setConfirmed] = useState(false);
  const [polling, setPolling] = useState(true);
  const [polls, setPolls] = useState(0);
  const tierRef = useRef(subscriptionTier);

  // Keep the ref in sync so the interval callback reads the latest value
  tierRef.current = subscriptionTier;

  useEffect(() => {
    if (!user) return;

    // Already correct — webhook may have fired before page loaded
    if (subscriptionTier === expectedTier) {
      setConfirmed(true);
      setPolling(false);
      return;
    }

    let pollCount = 0;

    const interval = setInterval(async () => {
      pollCount++;
      setPolls(pollCount);

      if (pollCount >= MAX_POLLS) {
        clearInterval(interval);
        setPolling(false);
        return;
      }

      await refreshProfile();

      // Read the latest tier from the ref (refreshProfile triggers a re-render
      // but the interval closure still sees the old value)
      if (tierRef.current === expectedTier) {
        clearInterval(interval);
        setConfirmed(true);
        setPolling(false);
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [user?.id, subscriptionTier, expectedTier, refreshProfile]);

  // Also confirm on re-render if tier has changed
  useEffect(() => {
    if (subscriptionTier === expectedTier && !confirmed) {
      setConfirmed(true);
      setPolling(false);
    }
  }, [subscriptionTier, expectedTier, confirmed]);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center relative">
        <div className="w-24 h-24 bg-gold-400/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-gold-400/20 shadow-2xl shadow-gold-400/10 animate-fade-in-up">
          <Crown className="w-12 h-12 text-gold-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Welcome to Pro!
        </h1>
        <p className="text-navy-300 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Your <span className="text-gold-400 font-semibold">{planLabel}</span> subscription
          is now active. Enjoy unlimited access to all BibleAI features.
        </p>

        <div
          className="bg-navy-900/80 border border-navy-800 rounded-2xl p-5 mb-8 animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          {confirmed ? (
            <div className="flex items-center justify-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                Subscription confirmed — your account is upgraded!
              </span>
            </div>
          ) : polling ? (
            <div className="flex items-center justify-center gap-3 text-gold-400">
              <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
              <span className="text-sm text-navy-300">
                Confirming your subscription&hellip; ({polls}/{MAX_POLLS})
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-navy-400">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                Subscription is processing — it will reflect in a few seconds.
              </span>
            </div>
          )}
        </div>

        <ul className="text-left space-y-3 mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {[
            'Unlimited AI Bible Chat messages',
            'Unlimited prayer journal entries',
            'Prayer analytics & insights',
            'Priority AI responses',
            'Daily devotional archive',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-navy-200">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-gold-400 text-navy-950 font-semibold py-3.5 rounded-xl hover:bg-gold-300 transition-colors shadow-lg shadow-gold-400/20 flex items-center justify-center gap-2 animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <Sparkles className="w-5 h-5" />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

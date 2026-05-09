import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Crown, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { trackEvent } from '../lib/analytics';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  limitType?: 'ai_messages' | 'prayers' | null;
  limitDetail?: string;
}

const PRO_FEATURES = [
  'Unlimited AI Bible Chat messages',
  'Unlimited prayer journal entries',
  'Prayer analytics & insights',
  'Priority AI responses',
  'Daily devotional archive',
];

export default function UpgradeModal({ open, onClose, limitType, limitDetail }: UpgradeModalProps) {
  const { session, isPro } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  if (!open || isPro) return null;

  const handleUpgrade = async () => {
    if (!session?.access_token) return;
    trackEvent('upgrade_button_clicked', {
      source: limitType || 'generic',
      plan: selectedPlan,
    });
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const limitMessage =
    limitType === 'ai_messages'
      ? "You've reached your daily AI message limit"
      : limitType === 'prayers'
        ? "You've reached your prayer journal limit"
        : 'Unlock the full experience';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-navy-900 border border-navy-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-navy-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gold-400/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Crown className="w-7 h-7 text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h2>
          <p className="text-sm text-navy-300">
            {limitMessage}
            {limitDetail && <span className="block mt-1 text-xs text-navy-400">{limitDetail}</span>}
          </p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`relative p-4 rounded-xl border text-left transition-all ${
              selectedPlan === 'monthly'
                ? 'border-gold-400/40 bg-gold-400/5'
                : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
            }`}
          >
            <p className="text-xs text-navy-400 mb-1">Monthly</p>
            <p className="text-xl font-bold text-white">$4.99</p>
            <p className="text-xs text-navy-400">/month</p>
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`relative p-4 rounded-xl border text-left transition-all ${
              selectedPlan === 'yearly'
                ? 'border-gold-400/40 bg-gold-400/5'
                : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
            }`}
          >
            <div className="absolute -top-2 right-3 bg-emerald-400 text-navy-950 text-[9px] font-bold px-2 py-0.5 rounded-md">
              SAVE 33%
            </div>
            <p className="text-xs text-navy-400 mb-1">Yearly</p>
            <p className="text-xl font-bold text-white">$39.99</p>
            <p className="text-xs text-navy-400">/year ($3.33/mo)</p>
          </button>
        </div>

        {/* Features */}
        <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-gold-400 mb-3">Everything in Pro</p>
          <ul className="space-y-2">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-navy-200">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-gold-400 text-navy-950 font-semibold py-3 rounded-xl hover:bg-gold-300 transition-colors shadow-lg shadow-gold-400/20 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Upgrade to Pro
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm text-navy-400 hover:text-white transition-colors py-2 mt-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

import { useAuth } from '../context/AuthContext';
import { X, Sparkles, Crown, Check, Loader2, Zap, Star, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { trackEvent } from '../lib/analytics';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  limitType?: 'ai_messages' | 'prayers' | null;
  limitDetail?: string;
}

const PRO_FEATURES = [
  { icon: Zap, label: 'Unlimited AI Bible Chat messages' },
  { icon: Star, label: 'Unlimited prayer journal entries' },
  { icon: Zap, label: 'Prayer analytics & insights' },
  { icon: Sparkles, label: 'Priority AI responses' },
  { icon: ShieldCheck, label: 'Daily devotional archive' },
];

export default function UpgradeModal({ open, onClose, limitType, limitDetail }: UpgradeModalProps) {
  const { session, isPro } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [open]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
      <div 
        className={`absolute inset-0 bg-navy-950/80 backdrop-blur-md transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Background Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/20 rounded-full blur-[120px] pointer-events-none transition-all duration-1000 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />

      <div className={`relative bg-navy-900 border border-white/10 rounded-[2.5rem] p-8 sm:p-10 max-w-lg w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}>
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-navy-400 hover:text-white transition-all hover:rotate-90"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gold-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gold-400/20 animate-glow-pulse">
            <Crown className="w-10 h-10 text-navy-950" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Upgrade to <span className="text-gold-gradient bg-clip-text text-transparent">Pro</span></h2>
          <p className="text-navy-300">
            {limitMessage}
            {limitDetail && <span className="block mt-2 text-xs font-medium text-gold-400/80 uppercase tracking-widest">{limitDetail}</span>}
          </p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`group relative p-5 rounded-3xl border transition-all duration-300 text-left ${
              selectedPlan === 'monthly'
                ? 'border-gold-400/50 bg-gold-400/5 shadow-lg shadow-gold-400/5'
                : 'border-navy-800 bg-navy-800/40 hover:border-navy-700'
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${selectedPlan === 'monthly' ? 'text-gold-400' : 'text-navy-500'}`}>Monthly</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">$4.99</span>
              <span className="text-xs text-navy-400">/mo</span>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`group relative p-5 rounded-3xl border transition-all duration-300 text-left ${
              selectedPlan === 'yearly'
                ? 'border-gold-400/50 bg-gold-400/5 shadow-lg shadow-gold-400/5 ring-1 ring-gold-400/30'
                : 'border-navy-800 bg-navy-800/40 hover:border-navy-700'
            }`}
          >
            <div className="absolute -top-3 right-3 bg-gold-gradient text-navy-950 text-[9px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Star className="w-2.5 h-2.5" /> MOST POPULAR
            </div>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${selectedPlan === 'yearly' ? 'text-gold-400' : 'text-navy-500'}`}>Annual</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">$39.99</span>
              <span className="text-xs text-navy-400">/yr</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-400 mt-1">$3.33/mo — save $19.89</p>
          </button>
        </div>

        {/* Annual savings callout */}
        {selectedPlan === 'yearly' && (
          <div className="mb-6 bg-emerald-400/5 border border-emerald-400/20 rounded-2xl px-4 py-3 flex items-center gap-3 animate-slide-up-fade">
            <div className="w-8 h-8 bg-emerald-400/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-300 font-bold">
              You save <span className="text-emerald-400">$19.89 per year</span> compared to monthly — that's 4 months free!
            </p>
          </div>
        )}

        {/* Features list */}
        <div className="bg-navy-800/30 border border-navy-800/50 rounded-3xl p-6 mb-8">
          <ul className="space-y-4">
            {PRO_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <li 
                  key={feature.label} 
                  className="flex items-center gap-3 text-sm text-navy-200 animate-slide-up-fade"
                  style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  {feature.label}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Action button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="group relative w-full h-14 bg-gold-gradient rounded-2xl overflow-hidden shadow-xl shadow-gold-400/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center justify-center gap-3">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-navy-950" />
                <span className="font-bold text-navy-950">Redirecting to Stripe...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-navy-950" />
                <span className="font-bold text-navy-950 text-lg">Get BibleAI Pro</span>
              </>
            )}
          </div>
        </button>
        
        <button
          onClick={onClose}
          className="w-full text-center text-sm font-medium text-navy-500 hover:text-navy-300 transition-colors mt-6"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

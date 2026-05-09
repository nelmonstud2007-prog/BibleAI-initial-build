import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmailConfirmed() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[420px] bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl bg-navy-900/60 border border-navy-800 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-black/40">
        <div className="relative w-24 h-24 mx-auto mb-7">
          <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <span className="absolute inset-2 rounded-full bg-emerald-400/20 animate-pulse" />
          <div className="relative w-full h-full rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white">Email Confirmed! 🙏</h1>
        <p className="mt-3 text-navy-300 text-base">
          Welcome to BibleAI. Your account is ready.
        </p>

        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center justify-center bg-gold-400 text-navy-950 font-semibold px-8 py-3 rounded-xl hover:bg-gold-300 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-gold-400/20"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

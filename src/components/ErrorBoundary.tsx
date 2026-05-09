import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Cross, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Dashboard:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-navy-900 border border-gold-400/20 rounded-[2.5rem] p-12 shadow-2xl text-center space-y-8 animate-scale-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gold-400/10 rounded-3xl border border-gold-400/20 mb-2">
              <Cross className="w-10 h-10 text-gold-400" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-black text-white tracking-tight italic">Something went wrong</h1>
              <p className="text-navy-300 text-sm leading-relaxed font-medium">
                We're sorry for the interruption. We've been notified and are working to restore the sacred space.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gold-gradient text-navy-950 font-black py-4 rounded-2xl shadow-xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              
              <Link
                to="/dashboard"
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-navy-800 text-white font-black py-4 rounded-2xl border border-white/5 hover:bg-navy-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                <Home className="w-4 h-4 text-gold-400" />
                Back to Home
              </Link>
            </div>

            <p className="text-[10px] font-black text-navy-600 uppercase tracking-widest">
              BibleAI &bull; Error Protection
            </p>
          </div>
        </div>
      );
    }

    return this.children;
  }
}

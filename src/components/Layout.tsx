import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  MessageCircle,
  BookOpen,
  Sun,
  BarChart3,
  Settings,
  LogOut,
  Cross,
  Crown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import UpgradeModal from './UpgradeModal';
import OnboardingTour from './OnboardingTour';

const navItems: Array<{
  path: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}> = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/dashboard/bible-chat', label: 'Bible Chat', icon: MessageCircle },
  { path: '/dashboard/prayer-journal', label: 'Prayer Journal', icon: BookOpen },
  { path: '/dashboard/daily-verse', label: 'Daily Verse', icon: Sun },
  { path: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, proOnly: true },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, signOut, isPro } = useAuth();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const visibleNavItems = navItems.filter((item) => !item.proOnly || isPro);

  return (
    <div className="min-h-screen bg-navy-950 flex">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <OnboardingTour />

      {/* Sidebar */}
      <aside className="hidden lg:block lg:static inset-y-0 left-0 z-50 w-72 bg-navy-900 border-r border-navy-800">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
            <div className="w-10 h-10 bg-gold-400 rounded-lg flex items-center justify-center">
              <Cross className="w-5 h-5 text-navy-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">BibleAI</h1>
              <p className="text-xs text-navy-400">Walk in the Word</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-tour-id={
                    item.path === '/dashboard/bible-chat'
                      ? 'bible-chat-nav'
                      : item.path === '/dashboard/prayer-journal'
                        ? 'prayer-journal-nav'
                        : item.path === '/dashboard/daily-verse'
                          ? 'daily-verse-nav'
                          : undefined
                  }
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-gold-400/10 text-gold-400 border border-gold-400/20'
                      : 'text-navy-300 hover:text-white hover:bg-navy-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Upgrade CTA for free users */}
          {!isPro && (
            <div className="px-3 pb-2">
              <button
                onClick={() => setShowUpgrade(true)}
                data-tour-id="upgrade-button"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-gold-400/10 to-gold-400/5 border border-gold-400/20 text-gold-400 hover:from-gold-400/15 hover:to-gold-400/10 transition-all"
              >
                <Crown className="w-5 h-5 flex-shrink-0" />
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* User section */}
          <div className="px-3 py-4 border-t border-navy-800">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-9 h-9 bg-navy-700 rounded-full flex items-center justify-center text-gold-400 font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5">
                  {isPro ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-400 bg-gold-400/10 px-1.5 py-0.5 rounded-md">
                      <Crown className="w-3 h-3" />
                      PRO
                    </span>
                  ) : (
                    <p className="text-xs text-navy-400">Free Plan</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-3 mt-2 w-full rounded-xl text-sm font-medium text-navy-300 hover:text-red-400 hover:bg-red-400/5 transition-all duration-150"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navy-900/80 backdrop-blur-sm border-b border-navy-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Cross className="w-5 h-5 text-gold-400" />
            <span className="text-white font-bold">BibleAI</span>
          </div>
          {isPro && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-md">
              <Crown className="w-3 h-3" />
              PRO
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-900/95 backdrop-blur border-t border-navy-800 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className={`grid ${visibleNavItems.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'} gap-1`}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour-id={
                  item.path === '/dashboard/bible-chat'
                    ? 'bible-chat-nav'
                    : item.path === '/dashboard/prayer-journal'
                      ? 'prayer-journal-nav'
                      : item.path === '/dashboard/daily-verse'
                        ? 'daily-verse-nav'
                        : undefined
                }
                className={`flex flex-col items-center justify-center rounded-xl py-2 min-h-[44px] transition-colors ${
                  active ? 'text-gold-400 bg-gold-400/10' : 'text-navy-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] leading-none">{item.label.replace(' ', '')}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

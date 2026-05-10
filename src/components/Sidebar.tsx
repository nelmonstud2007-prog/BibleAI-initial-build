import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, MessageCircle, BookOpen, Sun, BarChart3, Settings, LogOut,
  Crown, Book, Flame, ChevronRight, Sparkles, Mail, Bookmark, Users,
  Moon, SunMedium, Shield, Award, Menu, X, ChevronLeft, Gear
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/dashboard/bible', label: 'Bible', icon: Book },
  { path: '/dashboard/bible-chat', label: 'Chat', icon: MessageCircle },
  { path: '/dashboard/prayer-journal', label: 'Journal', icon: BookOpen },
  { path: '/dashboard/daily-verse', label: 'Daily', icon: Sun },
  { path: '/dashboard/bookmarks', label: 'Saved', icon: Bookmark },
  { path: '/dashboard/community', label: 'Community', icon: Users },
  { path: '/dashboard/analytics', label: 'Stats', icon: BarChart3, proOnly: true },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, signOut, isPro } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const visibleNavItems = navItems.filter(item => !(item.proOnly && !isPro));

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen bg-white/[0.02] border-r border-white/5 transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-white/5">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <span className="text-navy-950 font-bold text-base">✝</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">BibleAI</h1>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-navy-400 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-none">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-gold-400/10 text-gold-400'
                  : 'text-navy-400 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-gold-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-white/5 p-3 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold text-navy-400 hover:text-white hover:bg-white/5 transition-all duration-150"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && (isDark ? 'Light' : 'Dark')}
        </button>

        {/* User Avatar & Info */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? user?.email : undefined}
        >
          <div className="w-9 h-9 bg-gold-gradient rounded-lg flex items-center justify-center text-navy-950 font-bold text-sm flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-navy-500">{isPro ? 'Pro' : 'Free'}</p>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold text-navy-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-150"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}

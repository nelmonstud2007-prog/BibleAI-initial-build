import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import CompleteProfile from './pages/CompleteProfile';
import EmailConfirmed from './pages/EmailConfirmed';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import UpgradeSuccess from './pages/UpgradeSuccess';
import DashboardHome from './pages/dashboard/DashboardHome';
import BibleChat from './pages/dashboard/BibleChat';
import PrayerJournal from './pages/dashboard/PrayerJournal';
import DailyVerse from './pages/dashboard/DailyVerse';
import Settings from './pages/dashboard/Settings';
import PrayerAnalytics from './pages/dashboard/PrayerAnalytics';
import Bible from './pages/dashboard/Bible';
import SeoMeta from './components/SeoMeta';

/**
 * Route layout:
 *
 * Public (accessible logged-in OR logged-out):
 *   /          → Landing
 *   /pricing   → Landing (or a dedicated Pricing page if you create one)
 *   /signin    → SignIn
 *   /signup    → SignUp
 *   /privacy   → Privacy
 *   /terms     → Terms
 *   /upgrade-success → UpgradeSuccess (must be accessible post-checkout redirect)
 *
 * Semi-protected (must be logged in, profile completion NOT required):
 *   /email-confirmed   → EmailConfirmed
 *   /complete-profile  → CompleteProfile
 *
 * Protected (must be logged in + profile complete):
 *   /dashboard/*
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SeoMeta />
        <Routes>
          {/* ── Public routes (no forced redirect for logged-in users) ── */}
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          {/* If you have a dedicated Pricing page, replace Landing below */}
          <Route path="/pricing" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* ── Upgrade success (public URL, Stripe redirects here) ── */}
          <Route path="/upgrade-success" element={<UpgradeSuccess />} />

          {/* ── Semi-protected (logged in, profile completion not enforced) ── */}
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute requireProfileComplete={false}>
                <CompleteProfile />
              </ProtectedRoute>
            }
          />

          {/* ── Protected dashboard ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="bible-chat" element={<BibleChat />} />
            <Route path="prayer-journal" element={<PrayerJournal />} />
            <Route path="daily-verse" element={<DailyVerse />} />
            <Route path="bible" element={<Bible />} />
            <Route path="analytics" element={<PrayerAnalytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
import Bookmarks from './pages/dashboard/Bookmarks';
import CommunityVerseFeed from './pages/dashboard/CommunityVerseFeed';
import CommunityForum from './pages/dashboard/CommunityForum';
import SharedVerse from './pages/SharedVerse';
import AdminDashboard from './pages/AdminDashboard';
import SeoMeta from './components/SeoMeta';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SeoMeta />
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/pricing" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/upgrade-success" element={<UpgradeSuccess />} />

            {/* ── Shared verse page (public, no auth required) ── */}
            <Route path="/share/:id" element={<SharedVerse />} />

            {/* ── Admin dashboard (hidden URL, password-gated) ── */}
            <Route path="/admin-x7k9p2" element={<AdminDashboard />} />

            {/* ── Semi-protected ── */}
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
                  <ErrorBoundary>
                    <DashboardLayout />
                  </ErrorBoundary>
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
              <Route path="bookmarks" element={<Bookmarks />} />
              <Route path="community" element={<CommunityForum />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

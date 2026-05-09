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
import DashboardHome from './pages/dashboard/DashboardHome';
import BibleChat from './pages/dashboard/BibleChat';
import PrayerJournal from './pages/dashboard/PrayerJournal';
import DailyVerse from './pages/dashboard/DailyVerse';
import Settings from './pages/dashboard/Settings';
import PrayerAnalytics from './pages/dashboard/PrayerAnalytics';
import Bible from './pages/dashboard/Bible';
import SeoMeta from './components/SeoMeta';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SeoMeta />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute requireProfileComplete={false}>
                <CompleteProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
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

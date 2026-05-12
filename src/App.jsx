import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import OtpPage from './components/OtpPage';
import OnboardingPage from './components/OnboardingPage';
import AppShell from './components/AppShell';
import ProfilePage from './components/ProfilePage';
import JoinPage from './components/JoinPage';
import './index.css';

function ThemeSync() {
  const { theme } = useApp();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}

function AppRoutes() {
  const { theme, toggleTheme, currentUser, loading } = useApp();
  const navigate = useNavigate();

  // When Supabase magic link is clicked, user lands on '/' already logged in.
  // Redirect them straight into the app.
  useEffect(() => {
    if (!loading && currentUser && window.location.pathname === '/') {
      navigate('/app', { replace: true });
    }
  }, [currentUser, loading, navigate]);

  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/"           element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/login"      element={!loading && currentUser ? <Navigate to="/app" replace /> : <LoginPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/otp"        element={!loading && currentUser ? <Navigate to="/app" replace /> : <OtpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app"        element={<AppShell />} />
        <Route path="/dashboard"  element={<AppShell />} />
        <Route path="/dashboard/*" element={<AppShell />} />
        <Route path="/profile"    element={<ProfilePage />} />
        <Route path="/join"       element={<JoinPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
}

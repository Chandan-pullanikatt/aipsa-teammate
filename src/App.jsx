import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import OtpPage from './components/OtpPage';
import OnboardingPage from './components/OnboardingPage';
import AppShell from './components/AppShell';
import ProfilePage from './components/ProfilePage';
import './index.css';

function ThemeSync() {
  const { theme } = useApp();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}

function AppRoutes() {
  const { theme, toggleTheme } = useApp();
  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/"           element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/login"      element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/otp"        element={<OtpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/app"        element={<AppShell />} />
        <Route path="/dashboard"  element={<AppShell />} />
        <Route path="/dashboard/*" element={<AppShell />} />
        <Route path="/profile"    element={<ProfilePage />} />
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

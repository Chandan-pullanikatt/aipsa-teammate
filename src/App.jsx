import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [theme, setTheme] = useState('light');
  const [hasSchool, setHasSchool] = useState(false); // Mock state

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <div className={`app-wrapper ${theme}`}>
        <Routes>
          <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="/dashboard/*" element={<Dashboard theme={theme} hasSchool={hasSchool} setHasSchool={setHasSchool} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

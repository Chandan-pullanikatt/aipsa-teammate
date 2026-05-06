import { useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import './LandingPage.css';
import logo from '../assets/teammate_logo.png';

export default function LandingPage({ theme, toggleTheme }) {
  const navigate  = useNavigate();
  const { currentUser } = useApp();

  return (
    <div className="landing-page">

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <img src={logo} alt="TeamMate" className="nav-logo" />
          <span className="nav-title">TeamMate</span>
        </div>
        <div className="nav-actions">
          <button className="nav-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="nav-login-btn" onClick={() => navigate(currentUser ? '/app' : '/login')}>
            {currentUser ? 'Go to App' : 'Login'}
          </button>
        </div>
      </nav>

      {/* ── Full-screen hero ── */}
      <section className="landing-hero">
        <div className="hero-overlay" />

        <div className="hero-body">
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            All India Private Schools Association
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15 }}
          >
            Empowering the Future of<br />
            <span className="hero-accent">Private Education in India</span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28 }}
          >
            TeamMate is the official office management platform for AIPSA member institutions.
            Streamline communication, tasks, and administration — all in one place.
          </motion.p>

          <motion.button
            className="hero-cta"
            onClick={() => navigate(currentUser ? '/app' : '/login')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.4 }}
          >
            {currentUser ? 'Open Portal' : 'Join the Association'} <ArrowRight size={18} />
          </motion.button>
        </div>

        <p className="hero-footer">Powered by TeamMate</p>
      </section>
    </div>
  );
}

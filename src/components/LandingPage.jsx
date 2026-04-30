import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Mail, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

import './LandingPage.css';
import logo from '../assets/teammate_logo.png';


const LandingPage = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <nav className="header navbar-white">
        <div className="nav-container">
          <div className="logo">
            <img src={logo} alt="TeamMate Logo" className="nav-logo" />
            <h1>TeamMate</h1>
          </div>
          

          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="login-btn" onClick={() => navigate('/login')}>Login</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content container">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Empowering the Future of <br />
            <span>Private Education in India</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            TeamMate is the definitive voice for over 20,000 member institutions. 
            We champion educational autonomy, establish national benchmarks, and foster a collaborative ecosystem for academic leadership.
          </motion.p>

          <motion.div 
            className="hero-buttons"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <button className="primary-cta centered-cta" onClick={() => navigate('/login')}>
              Join the Association <ArrowRight size={20} />
            </button>
          </motion.div>
        </div>
        
        <div className="hero-footer">
          <p>Powered by TeamMate</p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

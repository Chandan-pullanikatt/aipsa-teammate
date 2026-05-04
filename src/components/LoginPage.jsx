import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader } from 'lucide-react';

import './LoginPage.css';
import logo from '../assets/teammate_logo.png';

const DEMO_ACCOUNTS = [
  { email: 'test@schoolx.com',    role: 'Owner',   school: 'School X' },
  { email: 'teacher1@schoolx.com', role: 'Teacher', school: 'School X' },
  { email: 'teacher2@schoolx.com', role: 'Teacher', school: 'School X' },
  { email: 'manager1@schoolx.com', role: 'Manager', school: 'School X' },
  { email: 'staff1@schoolx.com',   role: 'Staff',   school: 'School X' },
];

const LoginPage = ({ theme, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      localStorage.setItem('tm_pending_email', email);
      navigate('/otp');
    }, 1000);
  };

  return (
    <div className="login-container">
      <button className="back-home" onClick={() => navigate('/')}>
        <ArrowLeft size={18} /> Back
      </button>

      <div className="portal-header">
        <div className="portal-logo-container">
          <img src={logo} alt="TeamMate Logo" className="portal-logo" />
        </div>
        <h1>TeamMate Portal</h1>
        <p>Advanced Office Management System</p>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h2>Welcome back</h2>
          <p>Enter your email address to receive a one-time login code.</p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSendOtp}
          className="login-form"
        >
          <div className="input-group floating-label-group">
            <div className="input-wrapper">
              <input
                type="email"
                placeholder=" "
                id="email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <label htmlFor="email-input">Email Address</label>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? <Loader className="spin" size={18} /> : (
              <><Mail size={18} /> Send OTP</>
            )}
          </button>
        </motion.form>
      </div>

      <div className="demo-panel">
        <p className="demo-panel-title">Demo accounts — click to use:</p>
        <div className="demo-accounts-grid">
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              className="demo-acc-btn"
              type="button"
              onClick={() => setEmail(acc.email)}
            >
              <span className={`demo-role-chip role-${acc.role.toLowerCase()}`}>{acc.role}</span>
              <span className="demo-acc-email">{acc.email}</span>
            </button>
          ))}
          <button
            className="demo-acc-btn demo-acc-new"
            type="button"
            onClick={() => setEmail('newuser@example.com')}
          >
            <span className="demo-role-chip role-new">New User</span>
            <span className="demo-acc-email">Register or join a school →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

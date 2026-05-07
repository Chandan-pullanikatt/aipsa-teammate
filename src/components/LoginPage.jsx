import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

import './LoginPage.css';
import logo from '../assets/teammate_logo.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError('');

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    setIsLoading(false);

    if (otpErr) {
      setError(otpErr.message || 'Failed to send OTP. Please try again.');
      return;
    }

    localStorage.setItem('tm_pending_email', email.trim().toLowerCase());
    navigate('/otp');
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
        <p>All India Private Schools Association — Office Management System</p>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h2>Sign in to your account</h2>
          <p>Enter your registered email address to receive a one-time login code.</p>
        </div>

        {error && <div className="ob-error" style={{ marginBottom: '1rem', maxWidth: 440 }}>{error}</div>}

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
    </div>
  );
};

export default LoginPage;

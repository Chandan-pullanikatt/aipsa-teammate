import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, GraduationCap, ArrowLeft, Loader } from 'lucide-react';

import './LoginPage.css';
import logo from '../assets/teammate_logo.png';


const LoginPage = ({ theme, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
    }, 1200);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1200);
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
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
          <h2>{step === 'email' ? 'Welcome back' : 'Verify your email'}</h2>
          <p>
            {step === 'email' 
              ? 'Enter your registered email to receive a login OTP' 
              : `We've sent a 6-digit code to ${email}`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form 
              key="email-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
                  />
                  <label htmlFor="email-input">Email Address</label>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? <Loader className="spin" size={18} /> : (
                  <>
                    <Mail size={18} />
                    Send OTP
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="otp-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleVerifyOtp}
              className="login-form"
            >
              <div className="otp-inputs">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="otp-field"
                  />
                ))}
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? <Loader className="spin" size={18} /> : 'Verify & Login'}
              </button>

              <button 
                type="button" 
                className="resend-btn" 
                onClick={() => setStep('email')}
                disabled={isLoading}
              >
                Change Email
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage;

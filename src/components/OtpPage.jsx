import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './OtpPage.css';

export default function OtpPage() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);
  const navigate = useNavigate();
  const { login, memberships, users } = useApp();

  const email = localStorage.getItem('tm_pending_email') || 'your email';

  useEffect(() => {
    if (!localStorage.getItem('tm_pending_email')) {
      navigate('/login');
    }
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  function handleChange(idx, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (digits.join('').length < 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 700));

    const user = login(email);
    localStorage.removeItem('tm_pending_email');

    // Check memberships synchronously from existing state (login only changes currentUser)
    const existingUser = users.find(u => u.email === email);
    const hasMembership = memberships.some(m => m.userId === (existingUser?.id || user.id));

    setLoading(false);
    navigate(hasMembership ? '/app' : '/onboarding');
  }

  function handleResend() {
    setTimer(60);
    setCanResend(false);
    setDigits(['', '', '', '', '', '']);
    refs.current[0]?.focus();
  }

  function handleBack() {
    localStorage.removeItem('tm_pending_email');
    navigate('/login');
  }

  return (
    <div className="otp-page">
      <button className="otp-back" onClick={handleBack}>← Back</button>

      <div className="otp-card">
        <div className="otp-mail-icon">✉</div>
        <h2>Check your email</h2>
        <p className="otp-subtitle">
          We sent a 6-digit code to<br />
          <strong>{email}</strong>
        </p>
        <p className="otp-hint">Enter any 6 digits for this demo.</p>

        {error && <div className="otp-error">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="otp-boxes">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`otp-box${d ? ' filled' : ''}`}
              />
            ))}
          </div>

          <button type="submit" className="otp-btn" disabled={loading}>
            {loading ? <span className="otp-spinner" /> : 'Verify & Continue'}
          </button>
        </form>

        <div className="otp-resend">
          {canResend
            ? <button onClick={handleResend} className="resend-link">Resend OTP</button>
            : <span>Resend available in <strong>{timer}s</strong></span>
          }
        </div>
      </div>
    </div>
  );
}

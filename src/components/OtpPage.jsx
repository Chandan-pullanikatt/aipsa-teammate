import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './OtpPage.css';

const OTP_LENGTH = 6;

export default function OtpPage() {
  const [digits, setDigits]       = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer]         = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const refs    = useRef([]);
  const navigate = useNavigate();

  const email = localStorage.getItem('tm_pending_email') || '';

  useEffect(() => {
    if (!email) { navigate('/login'); return; }
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
    if (val && idx < OTP_LENGTH - 1) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  // Handle paste — fill all boxes at once
  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    refs.current[focusIdx]?.focus();
  }

  async function handleVerify(e) {
    e.preventDefault();
    const token = digits.join('');
    if (token.length < OTP_LENGTH) {
      setError(`Please enter the complete ${OTP_LENGTH}-digit code.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyErr) {
        setLoading(false);
        setError('Invalid or expired code. Please request a new one.');
        setDigits(Array(OTP_LENGTH).fill(''));
        refs.current[0]?.focus();
        return;
      }

      localStorage.removeItem('tm_pending_email');
      setLoading(false);
      navigate('/app', { replace: true }); // AppShell handles no-school redirect

    } catch (err) {
      setLoading(false);
      setError('Connection error. Please check your network and try again.');
    }
  }

  async function handleResend() {
    setTimer(60);
    setCanResend(false);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');

    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (otpErr) setError(otpErr.message || 'Failed to resend. Please try again.');
      else refs.current[0]?.focus();
    } catch {
      setError('Failed to resend. Please try again.');
    }
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
          We sent a {OTP_LENGTH}-digit code to<br />
          <strong>{email}</strong>
        </p>

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
                onPaste={handlePaste}
                className={`otp-box${d ? ' filled' : ''}`}
              />
            ))}
          </div>

          <button type="submit" className="otp-btn" disabled={loading || digits.join('').length < OTP_LENGTH}>
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

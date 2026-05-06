import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './OtpPage.css';

export default function OtpPage() {
  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [timer, setTimer]       = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
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
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const token = digits.join('');
    if (token.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyErr) {
      setLoading(false);
      setError(verifyErr.message || 'Invalid or expired code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
      return;
    }

    localStorage.removeItem('tm_pending_email');

    // Check if user has any school memberships to decide where to redirect
    const { data: memberships } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', data.user.id)
      .limit(1);

    setLoading(false);
    navigate(memberships?.length ? '/app' : '/onboarding', { replace: true });
  }

  async function handleResend() {
    setTimer(60);
    setCanResend(false);
    setDigits(['', '', '', '', '', '']);
    setError('');

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (otpErr) setError(otpErr.message || 'Failed to resend. Please try again.');
    else refs.current[0]?.focus();
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

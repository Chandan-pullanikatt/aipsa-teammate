import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './OnboardingPage.css';

export default function OnboardingPage() {
  const navigate  = useNavigate();
  const { registerSchool, joinSchool, currentUser, loading } = useApp();

  const [regForm,    setRegForm]    = useState({ name: '', address: '', type: 'Secondary' });
  const [regLoading, setRegLoading] = useState(false);
  const [regError,   setRegError]   = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const [joinCode,    setJoinCode]    = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError,   setJoinError]   = useState('');

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)', fontSize: '0.95rem', gap: '1rem' }}>
      <div className="otp-spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px', borderColor: 'var(--primary) transparent var(--primary) transparent' }} />
      Setting up your workspace…
    </div>
  );

  if (!currentUser) { navigate('/login'); return null; }

  async function handleRegister(e) {
    e.preventDefault();
    if (!regForm.name.trim()) { setRegError('School name is required.'); return; }
    setRegLoading(true);
    setRegError('');
    try {
      await registerSchool(regForm.name.trim(), regForm.address.trim(), regForm.type);
      navigate('/app');
    } catch (err) {
      setRegError(err.message || 'Failed to register school. Please try again.');
      setRegLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) { setJoinError('Please enter an invite code.'); return; }
    setJoinLoading(true);
    setJoinError('');
    try {
      const result = await joinSchool(joinCode.trim());
      if (result.success) {
        navigate('/app');
      } else {
        setJoinError(result.error || 'Invalid invite code.');
        setJoinLoading(false);
      }
    } catch (err) {
      setJoinError(err.message || 'Something went wrong. Please try again.');
      setJoinLoading(false);
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <h1>Welcome to TeamMate</h1>
        <p>Join your school with an invite code, or register a new institution.</p>
      </div>

      {/* ── Join with Code — Primary / Front ── */}
      <div className="onboarding-card ob-primary-card">
        <div className="ob-card-icon">🔑</div>
        <h2>Join with a Code</h2>
        <p className="ob-card-desc">Enter the invite code shared by your school administrator.</p>

        {joinError && <div className="ob-error">{joinError}</div>}

        <form onSubmit={handleJoin} className="ob-form">
          <div className="ob-field">
            <label>Invite Code *</label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. T-AB12"
              maxLength={20}
              autoCapitalize="characters"
              autoFocus
            />
          </div>
          <button type="submit" className="ob-btn" disabled={joinLoading}>
            {joinLoading ? <span className="ob-spinner" /> : 'Join School'}
          </button>
        </form>
      </div>

      {/* ── Register Your School — Secondary / Bottom ── */}
      <div className="ob-register-section">
        <button
          className={`ob-register-toggle${showRegister ? ' open' : ''}`}
          onClick={() => setShowRegister(v => !v)}
          type="button"
        >
          <span className="ob-reg-toggle-icon">🏫</span>
          <span className="ob-reg-toggle-text">Register Your School</span>
          <span className="ob-reg-toggle-arrow">{showRegister ? '▲' : '▼'}</span>
        </button>

        {showRegister && (
          <div className="ob-register-form-wrap">
            <p className="ob-card-desc ob-reg-desc">Set up a new school and become its owner.</p>

            {regError && <div className="ob-error">{regError}</div>}

            <form onSubmit={handleRegister} className="ob-form">
              <div className="ob-field">
                <label>School Name *</label>
                <input
                  type="text"
                  value={regForm.name}
                  onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. St. Mary's High School"
                  maxLength={120}
                />
              </div>
              <div className="ob-field">
                <label>School Address</label>
                <input
                  type="text"
                  value={regForm.address}
                  onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street, City, State"
                  maxLength={200}
                />
              </div>
              <div className="ob-field">
                <label>School Type</label>
                <select value={regForm.type} onChange={e => setRegForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="College">College</option>
                </select>
              </div>
              <button type="submit" className="ob-btn ob-btn-outline" disabled={regLoading}>
                {regLoading ? <span className="ob-spinner ob-spinner-dark" /> : 'Register School'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

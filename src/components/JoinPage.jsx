import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import './JoinPage.css';

export default function JoinPage() {
  const [searchParams]  = useSearchParams();
  const navigate         = useNavigate();
  const { currentUser, loading, acceptEmailInvite } = useApp();

  const token = searchParams.get('token');

  const [preview,  setPreview]  = useState(null);   // { schoolName, role, email, expiresAt }
  const [fetching, setFetching] = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [joining,  setJoining]  = useState(false);
  const [joinErr,  setJoinErr]  = useState('');

  useEffect(() => {
    if (!token) { setFetchErr('No invite token found in the link.'); setFetching(false); return; }
    api.get(`/invites/preview?token=${token}`)
      .then(({ data }) => { setPreview(data); setFetching(false); })
      .catch(err => {
        setFetchErr(err?.response?.data?.message || 'This invite link is invalid or has expired.');
        setFetching(false);
      });
  }, [token]);

  async function handleAccept() {
    if (!currentUser) { navigate(`/login?next=/join?token=${token}`); return; }
    setJoining(true); setJoinErr('');
    try {
      await acceptEmailInvite(token);
      navigate('/app', { replace: true });
    } catch (err) {
      setJoinErr(err?.response?.data?.message || 'Failed to accept invite. Please try again.');
      setJoining(false);
    }
  }

  if (loading || fetching) return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-spinner" />
        <p className="join-loading-text">Verifying invite…</p>
      </div>
    </div>
  );

  if (fetchErr) return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-icon join-icon-error">✕</div>
        <h2 className="join-title">Invalid Invite</h2>
        <p className="join-desc">{fetchErr}</p>
        <button className="join-btn join-btn-outline" onClick={() => navigate('/')}>Go Home</button>
      </div>
    </div>
  );

  const roleColors = { Admin: '#7c3aed', Manager: '#b45309', User: '#1a5c3a' };

  return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-icon">🏫</div>
        <h2 className="join-title">You're Invited!</h2>
        <p className="join-desc">
          You've been invited to join <strong>{preview.schoolName}</strong>.
        </p>

        <div className="join-role-badge" style={{ background: roleColors[preview.role] + '18', color: roleColors[preview.role] }}>
          {preview.role}
        </div>

        <p className="join-email-note">
          This invite was sent to <strong>{preview.email}</strong>.
          {!currentUser && ' Please log in with that email to accept.'}
        </p>

        {joinErr && <div className="ob-error" style={{ marginBottom: '1rem' }}>{joinErr}</div>}

        {currentUser ? (
          <button className="join-btn" onClick={handleAccept} disabled={joining}>
            {joining ? <span className="join-spinner-sm" /> : 'Accept Invitation'}
          </button>
        ) : (
          <button className="join-btn" onClick={() => navigate(`/login?next=/join?token=${token}`)}>
            Log In to Accept
          </button>
        )}

        <button className="join-btn join-btn-ghost" onClick={() => navigate('/')}>Cancel</button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './ProfilePage.css';

const ROLE_LABELS = {
  teacher: 'Teacher Invite',
  staff:   'Staff Invite',
  manager: 'Manager Invite',
};

const ROLE_BADGE_COLOR = {
  Owner:   '#1a5c3a',
  Teacher: '#2563eb',
  Manager: '#7c3aed',
  Staff:   '#b45309',
};

function getInitials(nameOrEmail) {
  const str = nameOrEmail || '';
  return str.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    currentUser, getCurrentUserSchools, getSchoolMembers,
    inviteCodes, regenerateCode, updateSchool, updateUserName,
    removeMember, logout,
  } = useApp();

  const [copied, setCopied] = useState(null);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  // School editing
  const [editSchoolId, setEditSchoolId] = useState(null);
  const [schoolForm, setSchoolForm] = useState({});

  // Member removal
  const [removingMemberId, setRemovingMemberId] = useState(null);

  if (!currentUser) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  const userSchools = getCurrentUserSchools();
  const displayName = currentUser.name || currentUser.email;

  async function copyCode(code, key) {
    await navigator.clipboard.writeText(code);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  function startEditName() {
    setNameValue(currentUser.name || '');
    setEditingName(true);
    setNameSaved(false);
  }

  function saveName() {
    if (nameValue.trim()) {
      updateUserName(nameValue.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
    setEditingName(false);
  }

  function handleNameKey(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setEditingName(false);
  }

  function startEditSchool(school) {
    setSchoolForm({ name: school.name, address: school.address || '', type: school.type || 'Secondary' });
    setEditSchoolId(school.id);
  }

  function saveSchool(schoolId) {
    if (schoolForm.name?.trim()) {
      updateSchool(schoolId, { name: schoolForm.name.trim(), address: schoolForm.address, type: schoolForm.type });
    }
    setEditSchoolId(null);
  }

  function handleRemoveMember(schoolId, userId) {
    removeMember(schoolId, userId);
    setRemovingMemberId(null);
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <button className="profile-back" onClick={() => navigate('/app')}>← Back to App</button>
        <h1>Profile &amp; Settings</h1>
      </div>

      <div className="profile-content">

        {/* ── Identity card ── */}
        <div className="profile-card">
          <div className="profile-identity-row">
            <div className="profile-big-avatar">
              {getInitials(displayName)}
            </div>
            <div className="profile-identity-info">
              {editingName ? (
                <div className="profile-name-edit">
                  <input
                    className="profile-name-input"
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={handleNameKey}
                    placeholder="Your full name"
                    maxLength={80}
                    autoFocus
                  />
                  <button className="pn-save" onClick={saveName}>Save</button>
                  <button className="pn-cancel" onClick={() => setEditingName(false)}>Cancel</button>
                </div>
              ) : (
                <div className="profile-name-row">
                  <h2 className="profile-name">
                    {currentUser.name || <span className="profile-name-placeholder">Set your name</span>}
                  </h2>
                  <button className="pn-edit-btn" onClick={startEditName}>
                    {nameSaved ? '✓ Saved' : 'Edit name'}
                  </button>
                </div>
              )}
              <p className="profile-email">{currentUser.email}</p>
            </div>
          </div>
        </div>

        {/* ── School memberships ── */}
        <div className="profile-card">
          <h3 className="profile-section-title">School Memberships</h3>
          {userSchools.length === 0 && (
            <p className="profile-empty">You are not a member of any school.</p>
          )}
          {userSchools.map(({ school, role }) => (
            <div key={school.id} className="profile-membership-row">
              <div>
                <span className="pm-name">{school.name}</span>
                <span className="pm-addr">{school.address}</span>
              </div>
              <span
                className="pm-badge"
                style={{ background: ROLE_BADGE_COLOR[role] + '18', color: ROLE_BADGE_COLOR[role] }}
              >
                {role}
              </span>
            </div>
          ))}
        </div>

        {/* ── Owner sections per school ── */}
        {userSchools.filter(({ role }) => role === 'Owner').map(({ school }) => {
          const codes = inviteCodes[school.id] || {};
          const members = getSchoolMembers(school.id);

          return (
            <div key={school.id}>

              {/* Invite codes */}
              <div className="profile-card">
                <h3 className="profile-section-title">Invite Codes — {school.name}</h3>
                <p className="profile-section-sub">
                  Share these codes so staff can join your school.
                </p>
                <div className="invite-codes-list">
                  {Object.entries(codes).map(([roleKey, code]) => (
                    <div key={roleKey} className="invite-code-row">
                      <span className="ic-label">{ROLE_LABELS[roleKey] || roleKey}</span>
                      <code className="ic-code">{code}</code>
                      <div className="ic-actions">
                        <button
                          className="ic-btn"
                          onClick={() => copyCode(code, `${school.id}-${roleKey}`)}
                        >
                          {copied === `${school.id}-${roleKey}` ? '✓ Copied' : 'Copy'}
                        </button>
                        <button
                          className="ic-btn ic-regen"
                          onClick={() => regenerateCode(school.id, roleKey)}
                          title="Generate a new code (old code will stop working)"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Member management */}
              <div className="profile-card">
                <h3 className="profile-section-title">Members — {school.name}</h3>
                <p className="profile-section-sub">
                  {members.length} member{members.length !== 1 ? 's' : ''} in this school.
                </p>
                <div className="members-list">
                  {members.map(({ user, role }) => {
                    const isMe = user.id === currentUser.id;
                    const isConfirming = removingMemberId === `${school.id}-${user.id}`;
                    return (
                      <div key={user.id} className="member-row">
                        <div className="mr-avatar">{getInitials(user.name || user.email)}</div>
                        <div className="mr-info">
                          <span className="mr-name">{user.name || <em>{user.email}</em>}</span>
                          <span className="mr-email">{user.email}</span>
                        </div>
                        <span
                          className="pm-badge mr-role"
                          style={{ background: (ROLE_BADGE_COLOR[role] || '#666') + '18', color: ROLE_BADGE_COLOR[role] || '#666' }}
                        >
                          {role}
                        </span>
                        {!isMe && (
                          <div className="mr-actions">
                            {isConfirming ? (
                              <>
                                <button
                                  className="mr-remove-confirm"
                                  onClick={() => handleRemoveMember(school.id, user.id)}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="mr-remove-cancel"
                                  onClick={() => setRemovingMemberId(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="mr-remove-btn"
                                onClick={() => setRemovingMemberId(`${school.id}-${user.id}`)}
                                title="Remove from school"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* School settings */}
              <div className="profile-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">School Settings</h3>
                  {editSchoolId !== school.id && (
                    <button className="ic-btn" onClick={() => startEditSchool(school)}>Edit</button>
                  )}
                </div>

                {editSchoolId === school.id ? (
                  <div className="school-edit-form">
                    <div className="ob-field">
                      <label>School Name</label>
                      <input
                        type="text"
                        value={schoolForm.name}
                        onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))}
                        maxLength={120}
                      />
                    </div>
                    <div className="ob-field">
                      <label>Address</label>
                      <input
                        type="text"
                        value={schoolForm.address}
                        onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))}
                        maxLength={200}
                      />
                    </div>
                    <div className="ob-field">
                      <label>Type</label>
                      <select value={schoolForm.type} onChange={e => setSchoolForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                        <option value="College">College</option>
                      </select>
                    </div>
                    <div className="school-edit-actions">
                      <button className="task-form-cancel" onClick={() => setEditSchoolId(null)}>Cancel</button>
                      <button className="task-form-submit" onClick={() => saveSchool(school.id)}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <div className="school-details">
                    <div className="sd-row"><span>Name</span><span>{school.name}</span></div>
                    <div className="sd-row"><span>Address</span><span>{school.address || '—'}</span></div>
                    <div className="sd-row"><span>Type</span><span>{school.type || '—'}</span></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Logout ── */}
        <div className="profile-card">
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>

      </div>
    </div>
  );
}

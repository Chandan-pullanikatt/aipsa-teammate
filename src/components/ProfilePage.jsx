import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, getCurrentUserSchools, inviteCodes, regenerateCode, updateSchool, logout } = useApp();
  const [copied, setCopied] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [schoolForm, setSchoolForm] = useState({});

  if (!currentUser) { return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>; }

  const userSchools = getCurrentUserSchools();

  function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  async function copyCode(code, key) {
    await navigator.clipboard.writeText(code);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  function startEdit(school) {
    setSchoolForm({ name: school.name, address: school.address, type: school.type });
    setEditMode(school.id);
  }

  function saveEdit(schoolId) {
    updateSchool(schoolId, schoolForm);
    setEditMode(false);
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const ROLE_LABELS = {
    teacher: 'Teacher Invite',
    staff: 'Staff Invite',
    manager: 'Manager Invite',
  };

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <button className="profile-back" onClick={() => navigate('/app')}>← Back</button>
        <h1>Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card profile-identity">
          <div className="profile-big-avatar">{getInitials(currentUser.name)}</div>
          <h2 className="profile-name">{currentUser.name}</h2>
          <div className="profile-email-field">
            <label>Email</label>
            <input type="email" value={currentUser.email} readOnly />
          </div>
        </div>

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
              <span className={`pm-badge role-${role.toLowerCase()}`}>{role}</span>
            </div>
          ))}
        </div>

        {userSchools.filter(({ role }) => role === 'Owner').map(({ school }) => {
          const codes = inviteCodes[school.id] || {};
          return (
            <React.Fragment key={school.id}>
              <div className="profile-card">
                <h3 className="profile-section-title">Invite Codes — {school.name}</h3>
                <p className="profile-section-sub">Share these codes so members can join your school.</p>
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
                          {copied === `${school.id}-${roleKey}` ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          className="ic-btn ic-regen"
                          onClick={() => regenerateCode(school.id, roleKey)}
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-section-header">
                  <h3 className="profile-section-title">School Settings</h3>
                  {editMode !== school.id && (
                    <button className="ic-btn" onClick={() => startEdit(school)}>Edit</button>
                  )}
                </div>

                {editMode === school.id ? (
                  <div className="school-edit-form">
                    <div className="ob-field">
                      <label>School Name</label>
                      <input
                        type="text"
                        value={schoolForm.name}
                        onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="ob-field">
                      <label>Address</label>
                      <input
                        type="text"
                        value={schoolForm.address}
                        onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))}
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
                      <button className="task-form-cancel" onClick={() => setEditMode(false)}>Cancel</button>
                      <button className="task-form-submit" onClick={() => saveEdit(school.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="school-details">
                    <div className="sd-row"><span>Name</span><span>{school.name}</span></div>
                    <div className="sd-row"><span>Address</span><span>{school.address}</span></div>
                    <div className="sd-row"><span>Type</span><span>{school.type}</span></div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        <div className="profile-card">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  );
}

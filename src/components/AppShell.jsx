import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';
import GroupView from './GroupView';
import './AppShell.css';

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = (dateStr.toString().includes('T') || dateStr.toString().includes('Z'))
    ? new Date(dateStr)
    : new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AppShell() {
  const navigate = useNavigate();
  const { currentUser, getCurrentUserSchools, getMyNotifications, markNotificationAsRead, theme, toggleTheme, loading, getSchoolMembers } = useApp();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showNameBanner = !bannerDismissed && currentUser && !currentUser.name;

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)', fontSize: '0.95rem', gap: '1rem' }}>
      <div className="otp-spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px', borderColor: 'var(--primary) transparent var(--primary) transparent' }} />
      Setting up your workspace…
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const userSchools = getCurrentUserSchools();
  const primarySchool = userSchools[0];

  if (!primarySchool) {
    return (
      <div className="appshell-no-school">
        <div className="appshell-no-school-icon">🏫</div>
        <h3>You're not part of any school yet</h3>
        <p>Register your institution or join one using an invite code.</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="ob-btn"
          style={{ marginTop: '1.25rem', width: 'auto', padding: '0.75rem 2rem' }}
        >
          Get Started
        </button>
      </div>
    );
  }

  const { school, role } = primarySchool;
  const overdueNotifs = getMyNotifications();

  function getInitials(nameOrEmail) {
    const str = nameOrEmail || '';
    return str.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  const displayName = currentUser.name || currentUser.email;

  return (
    <div className="appshell">
      <header className="appshell-topbar">
        <div className="topbar-left">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="topbar-logo">TeamMate</div>
          <span className="topbar-school">{school.name}</span>
        </div>

        <div className="topbar-right">
          {/* Dark mode toggle */}
          <button
            className="topbar-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          {/* Notification bell */}
          <div className="topbar-notif-wrap">
            <button
              className="topbar-icon-btn"
              onClick={() => setShowNotifs(v => !v)}
              aria-label="Notifications"
              title="Notifications"
            >
              <BellIcon />
              {overdueNotifs.length > 0 && (
                <span className="notif-badge">{overdueNotifs.length > 9 ? '9+' : overdueNotifs.length}</span>
              )}
            </button>

            {showNotifs && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <span>Notifications</span>
                  <button onClick={() => setShowNotifs(false)}>✕</button>
                </div>
                {overdueNotifs.length === 0 ? (
                  <div className="notif-empty">No notifications. You're all caught up!</div>
                ) : (
                  <ul className="notif-list">
                    {overdueNotifs.map(n => (
                      <li key={n.id} className={`notif-item ${n.type || 'info'}`}>
                        <span className={`notif-dot ${n.type || 'info'}`} />
                        <div style={{ flex: 1 }}>
                          <p className="notif-title">{n.title}</p>
                          <p className="notif-msg">{n.message}</p>
                          <p className="notif-due">{formatDate(n.createdAt)}</p>
                        </div>
                        {!n.isTask && (
                          <button 
                            className="notif-read-btn" 
                            onClick={(e) => { e.stopPropagation(); markNotificationAsRead(n.id); }}
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <span className="topbar-role-badge">{role}</span>

          <button
            className="topbar-avatar"
            onClick={() => navigate('/profile')}
            aria-label="Go to profile"
            title={displayName}
          >
            {getInitials(displayName)}
          </button>
        </div>
      </header>

      {showNameBanner && (
        <div className="name-prompt-banner">
          <span>👋 <strong>Welcome!</strong> Set your display name so teammates can recognise you.</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="name-prompt-link" onClick={() => navigate('/profile')}>
              Set Name →
            </button>
            <button className="name-prompt-close" onClick={() => setBannerDismissed(true)} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      <div className="appshell-body">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <div className={`appshell-sidebar${sidebarOpen ? ' open' : ''}`}>
          <Sidebar
            schoolId={school.id}
            selectedGroupId={selectedGroup?.id}
            onSelectGroup={(g) => { setSelectedGroup(g); setSidebarOpen(false); }}
          />
        </div>

        <main className="appshell-main">
          {!selectedGroup ? (
            <div className="appshell-empty">
              {(role === 'Owner' || role === 'Admin') ? (
                <div className="owner-overview">
                  <div className="owner-overview-header">
                    <h3>School Overview</h3>
                    <p>Manage your staff and groups from the sidebar or see recent members below.</p>
                  </div>
                  <div className="owner-members-card">
                    <h4>Staff Members ({getSchoolMembers(school.id).length})</h4>
                    <div className="owner-members-list">
                      {getSchoolMembers(school.id).map(({ user, role }) => (
                        <div key={user.id} className="owner-member-row">
                          <div className="omr-avatar">{getInitials(user.name || user.email)}</div>
                          <div className="omr-info">
                            <span className="omr-name">{user.name || user.email}</span>
                            <span className={`omr-role ${role.toLowerCase()}`}>{role}</span>
                            <span className="omr-email">{user.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="appshell-empty-icon">👈</div>
                  <h3>Select a group to get started</h3>
                  <p>Choose a group from the sidebar to view its chat, tasks, and reports.</p>
                </>
              )}
            </div>
          ) : (
            <GroupView key={selectedGroup.id} group={selectedGroup} schoolId={school.id} />
          )}
        </main>
      </div>
    </div>
  );
}

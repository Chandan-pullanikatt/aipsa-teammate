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

function SchoolOverview({ school, role, getGroupsForUser, getGroupTasks, getSchoolMembers, getUserById, getInitials }) {
  const isOwner = role === 'Owner';

  const groups = getGroupsForUser(school.id);
  const allTasks = groups.flatMap(g => getGroupTasks(g.id));

  // Per-group task stats
  const groupStats = groups.map(g => {
    const tasks     = getGroupTasks(g.id);
    const pending   = tasks.filter(t => t.status === 'pending').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total     = tasks.length;
    const pct       = total ? Math.round((completed / total) * 100) : 0;
    return { group: g, pending, completed, total, pct };
  }).filter(s => s.total > 0);          // only show groups that have tasks

  // Recent completed tasks — sorted newest first via updatedAt
  const recentDone = allTasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 10);

  const groupName = id => groups.find(g => g.id === id)?.name || '—';

  return (
    <div className="owner-overview">
      <div className="owner-overview-header">
        <h3>School Overview</h3>
        <p>{school.name}</p>
      </div>

      {/* ── Active Tasks by Group ── */}
      {groupStats.length > 0 && (
        <div className="overview-section-card">
          <h4 className="overview-section-title">Active Tasks by Group</h4>
          <div className="ov-table-wrap">
            <table className="ov-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Completed</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {groupStats.map(({ group, pending, completed, total, pct }) => (
                  <tr key={group.id}>
                    <td className="ov-group-name">{group.name}</td>
                    <td>{total}</td>
                    <td><span className="ov-badge pending">{pending}</span></td>
                    <td><span className="ov-badge completed">{completed}</span></td>
                    <td>
                      <div className="ov-prog-wrap">
                        <div className="ov-prog-bar">
                          <div className="ov-prog-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="ov-prog-pct">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {groupStats.length === 0 && (
        <div className="overview-section-card ov-empty">
          <span>📋</span>
          <p>No tasks yet. Create a group and start assigning tasks.</p>
        </div>
      )}

      {/* ── Recent Actions ── */}
      <div className="overview-section-card">
        <h4 className="overview-section-title">Recent Actions</h4>
        {recentDone.length === 0 ? (
          <p className="ov-no-actions">No completed tasks yet.</p>
        ) : (
          <div className="ov-actions-list">
            {recentDone.map(task => {
              const assignee = getUserById(task.assignedTo);
              const name     = assignee ? (assignee.name || assignee.email) : 'Someone';
              return (
                <div key={task.id} className="ov-action-row">
                  <span className="ov-action-check">✓</span>
                  <div className="ov-action-info">
                    <span className="ov-action-title">{task.title}</span>
                    <span className="ov-action-meta">
                      {name} · {groupName(task.groupId)}
                    </span>
                  </div>
                  <span className={`ov-prio-dot prio-${task.priority}`} title={task.priority} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Staff Members (Owner only) ── */}
      {isOwner && (
        <div className="owner-members-card">
          <h4>Staff Members ({getSchoolMembers(school.id).length})</h4>
          <div className="owner-members-list">
            {getSchoolMembers(school.id).map(({ user, role: r }) => (
              <div key={user.id} className="owner-member-row">
                <div className="omr-avatar">{getInitials(user.name || user.email)}</div>
                <div className="omr-info">
                  <span className="omr-name">{user.name || user.email}</span>
                  <span className={`omr-role ${r.toLowerCase()}`}>{r}</span>
                  <span className="omr-email">{user.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { currentUser, getCurrentUserSchools, getMyNotifications, markNotificationAsRead, theme, toggleTheme, loading, getSchoolMembers, getGroupsForUser, getGroupTasks, getUserById } = useApp();
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
            <SchoolOverview
              school={school}
              role={role}
              getGroupsForUser={getGroupsForUser}
              getGroupTasks={getGroupTasks}
              getSchoolMembers={getSchoolMembers}
              getUserById={getUserById}
              getInitials={getInitials}
            />
          ) : (
            <GroupView key={selectedGroup.id} group={selectedGroup} schoolId={school.id} />
          )}
        </main>
      </div>
    </div>
  );
}

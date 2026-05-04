import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';
import GroupView from './GroupView';
import './AppShell.css';

export default function AppShell() {
  const navigate = useNavigate();
  const { currentUser, getCurrentUserSchools } = useApp();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!currentUser) return <Navigate to="/login" replace />;

  const userSchools = getCurrentUserSchools();
  const primarySchool = userSchools[0];

  if (!primarySchool) {
    return (
      <div className="appshell-no-school">
        <h3>You're not part of any school yet.</h3>
        <p>Register your school or join one using an invite code.</p>
        <button onClick={() => navigate('/onboarding')} className="ob-btn" style={{ marginTop: '1.25rem', width: 'auto', padding: '0.75rem 2rem' }}>
          Get Started
        </button>
      </div>
    );
  }

  const { school, role } = primarySchool;

  function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

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
          <span className="topbar-role-badge">{role}</span>
          <button
            className="topbar-avatar"
            onClick={() => navigate('/profile')}
            aria-label="Go to profile"
            title={currentUser.name}
          >
            {getInitials(currentUser.name)}
          </button>
        </div>
      </header>

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
              <div className="appshell-empty-icon">👈</div>
              <h3>Select a group to get started</h3>
              <p>Choose a group from the sidebar to view its chat, tasks, and reports.</p>
            </div>
          ) : (
            <GroupView key={selectedGroup.id} group={selectedGroup} schoolId={school.id} />
          )}
        </main>
      </div>
    </div>
  );
}

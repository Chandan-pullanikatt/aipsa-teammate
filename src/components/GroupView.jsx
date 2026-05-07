import React, { useState, useEffect } from 'react';
import ChatTab from './ChatTab';
import TasksTab from './TasksTab';
import ReportsTab from './ReportsTab';
import './GroupView.css';

export default function GroupView({ group, schoolId }) {
  const [tab, setTab] = useState('chat');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(t);
  }, [group.id]);

  if (loading) {
    return (
      <div className="group-view">
        <div className="group-header skeleton-line" style={{ height: 28, width: 200, marginBottom: '1rem' }} />
        <div className="group-tabs skeleton-tabs">
          {[1,2,3].map(i => <div key={i} className="skeleton-line" style={{ height: 20, width: 60 }} />)}
        </div>
        <div className="group-content" style={{ padding: '1.25rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-line" style={{ height: 72, marginBottom: '0.75rem', borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group-view">
      <div className="group-header">
        <h2>{group.name}</h2>
      </div>
      <div className="group-tabs">
        {['chat', 'tasks', 'reports'].map(t => (
          <button
            key={t}
            className={`group-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="group-content">
        {tab === 'chat' && <ChatTab groupId={group.id} schoolId={schoolId} />}
        {tab === 'tasks' && <TasksTab groupId={group.id} schoolId={schoolId} />}
        {tab === 'reports' && <ReportsTab groupId={group.id} />}
      </div>
    </div>
  );
}

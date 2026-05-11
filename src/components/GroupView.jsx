import React, { useState, useEffect } from 'react';
import ChatTab from './ChatTab';
import ReportsTab from './ReportsTab';
import './GroupView.css';

export default function GroupView({ group, schoolId }) {
  const [showReports, setShowReports] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShowReports(false);
    const t = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(t);
  }, [group.id]);

  if (loading) {
    return (
      <div className="group-view">
        <div className="group-header">
          <div className="skeleton-line" style={{ height: 24, width: 180 }} />
          <div className="skeleton-line" style={{ height: 30, width: 96, borderRadius: 6 }} />
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
        <button
          className={`group-reports-btn${showReports ? ' active' : ''}`}
          onClick={() => setShowReports(v => !v)}
          title={showReports ? 'Back to Chat' : 'View Reports'}
        >
          {showReports ? '← Chat' : '📊 Reports'}
        </button>
      </div>
      <div className="group-content">
        {showReports
          ? <ReportsTab groupId={group.id} />
          : <ChatTab groupId={group.id} schoolId={schoolId} />
        }
      </div>
    </div>
  );
}

import React from 'react';
import { useApp } from '../context/AppContext';
import './ReportsTab.css';

export default function ReportsTab({ groupId }) {
  const { getGroupTasks, getGroupMembers, getUserById } = useApp();
  const tasks = getGroupTasks(groupId);
  const members = getGroupMembers(groupId);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const overdue = tasks.filter(t => {
    if (t.status === 'completed') return false;
    return new Date(t.dueDate) < new Date(new Date().toDateString());
  }).length;

  const pctComplete = total ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (pctComplete / 100) * circumference;

  const priorityCounts = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };
  const maxPriority = Math.max(...Object.values(priorityCounts), 1);

  const memberStats = members.map(m => ({
    ...m,
    count: tasks.filter(t => t.assignedTo === m.id).length,
    done: tasks.filter(t => t.assignedTo === m.id && t.status === 'completed').length,
  }));

  return (
    <div className="reports-tab">
      <div className="reports-summary">
        {[
          { label: 'Total Tasks', value: total, cls: '' },
          { label: 'Completed', value: completed, cls: 'green' },
          { label: 'Pending', value: pending, cls: 'yellow' },
          { label: 'Overdue', value: overdue, cls: 'red' },
        ].map(s => (
          <div key={s.label} className={`report-card ${s.cls}`}>
            <span className="report-value">{s.value}</span>
            <span className="report-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="reports-row">
        <div className="report-section">
          <h4>Tasks by Priority</h4>
          <div className="bar-chart">
            {[
              { label: 'High', key: 'high', color: '#d32f2f' },
              { label: 'Medium', key: 'medium', color: '#f59e0b' },
              { label: 'Low', key: 'low', color: '#2e7d32' },
            ].map(({ label, key, color }) => (
              <div key={key} className="bar-row">
                <span className="bar-label">{label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(priorityCounts[key] / maxPriority) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="bar-count">{priorityCounts[key]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-section">
          <h4>Completion Rate</h4>
          <div className="circle-wrap">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="circle-pct">{pctComplete}%</div>
          </div>
          <p className="circle-label">{completed} of {total} tasks done</p>
        </div>
      </div>

      <div className="report-section">
        <h4>Member Workload</h4>
        {memberStats.length === 0 && <p className="report-empty">No members in this group.</p>}
        <div className="member-stats">
          {memberStats.map(m => {
            const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={m.id} className="member-stat-row">
                <div className="ms-avatar">{initials}</div>
                <div className="ms-info">
                  <span className="ms-name">{m.name}</span>
                  <span className="ms-tasks">{m.count} task{m.count !== 1 ? 's' : ''} · {m.done} completed</span>
                </div>
                <div className="ms-bar-wrap">
                  <div className="ms-bar-track">
                    <div className="ms-bar-fill" style={{ width: m.count ? `${(m.done / m.count) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

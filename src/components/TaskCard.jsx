import React from 'react';
import { useApp } from '../context/AppContext';
import './TaskCard.css';

const PRIORITY_COLOR = { high: '#d32f2f', medium: '#f59e0b', low: '#2e7d32' };

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(task) {
  if (task.status === 'completed') return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

export default function TaskCard({ task, canToggle = true }) {
  const { toggleTask, getUserById } = useApp();
  const assignee = getUserById(task.assignedTo);
  const overdue = isOverdue(task);
  const initials = assignee ? assignee.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';

  return (
    <div className={`task-card${task.status === 'completed' ? ' completed' : ''}`}
         style={{ borderLeftColor: PRIORITY_COLOR[task.priority] }}>
      <div className="task-card-main">
        {canToggle && (
          <button
            className={`task-check${task.status === 'completed' ? ' checked' : ''}`}
            onClick={() => toggleTask(task.id)}
            aria-label="Toggle task"
          >
            {task.status === 'completed' && '✓'}
          </button>
        )}
        <div className="task-info">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            <span className="task-assignee">
              <span className="task-avatar">{initials}</span>
              {assignee?.name || 'Unknown'}
            </span>
            <span className={`task-due${overdue ? ' overdue' : ''}`}>
              Due: {formatDate(task.dueDate)}
              {overdue && ' — Overdue'}
            </span>
          </div>
        </div>
        <span className={`task-priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>
      </div>
    </div>
  );
}

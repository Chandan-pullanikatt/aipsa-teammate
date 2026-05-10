import { useState } from 'react';
import { useApp } from '../context/AppContext';
import './TaskCard.css';

const PRIORITY_COLOR = { high: '#d32f2f', medium: '#f59e0b', low: '#2e7d32' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  // If it's already an ISO string or has a time component, parse directly.
  // Otherwise append T00:00:00 to keep it local to the date selected.
  const d = (dateStr.toString().includes('T') || dateStr.toString().includes('Z'))
    ? new Date(dateStr)
    : new Date(dateStr + 'T00:00:00');
    
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(task) {
  if (task.status === 'completed') return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

export default function TaskCard({ task, onEdit, canManage = false }) {
  const { toggleTask, deleteTask, getUserById } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const assignee = getUserById(task.assignedTo);
  const overdue = isOverdue(task);
  const initials = assignee
    ? (assignee.name || assignee.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  function handleDelete() {
    if (confirmDelete) {
      deleteTask(task.id);
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <div
      className={`task-card${task.status === 'completed' ? ' completed' : ''}${overdue ? ' overdue-card' : ''}`}
      style={{ borderLeftColor: PRIORITY_COLOR[task.priority] }}
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <div className="task-card-main">
        <button
          className={`task-check${task.status === 'completed' ? ' checked' : ''}`}
          onClick={() => toggleTask(task.id)}
          aria-label="Toggle task status"
        >
          {task.status === 'completed' && '✓'}
        </button>

        <div className="task-info">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            <span className="task-assignee">
              <span className="task-avatar">{initials}</span>
              {assignee ? (assignee.name || assignee.email) : 'Unassigned'}
            </span>
            {task.dueDate && (
              <span className={`task-due${overdue ? ' overdue' : ''}`}>
                Due: {formatDate(task.dueDate)}{overdue ? ' — Overdue' : ''}
              </span>
            )}
          </div>
        </div>

        <span className={`task-priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>

        {canManage && (
          <div className="task-actions">
            <button
              className="task-action-btn"
              onClick={() => onEdit(task)}
              aria-label="Edit task"
              title="Edit"
            >
              ✏️
            </button>
            <button
              className={`task-action-btn task-delete-btn${confirmDelete ? ' confirming' : ''}`}
              onClick={handleDelete}
              aria-label="Delete task"
              title={confirmDelete ? 'Click again to confirm delete' : 'Delete'}
            >
              {confirmDelete ? '⚠️' : '🗑️'}
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="task-delete-confirm">
          Delete this task?&nbsp;
          <button className="tdc-yes" onClick={() => deleteTask(task.id)}>Yes, delete</button>
          <button className="tdc-no" onClick={() => setConfirmDelete(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

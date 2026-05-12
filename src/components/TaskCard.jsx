import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import './TaskCard.css';

const PRIORITY_COLOR = { high: '#d32f2f', medium: '#f59e0b', low: '#2e7d32' };

function genId() { return Math.random().toString(36).slice(2, 9); }

function formatDate(dateStr) {
  if (!dateStr) return '';
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
  const { toggleTask, deleteTask, toggleTaskTodo, editTask, getUserById } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTodos,     setShowTodos]     = useState(false);
  const [newTodoText,   setNewTodoText]   = useState('');
  const addInputRef = useRef(null);

  const assignee = getUserById(task.assignedTo);
  const overdue  = isOverdue(task);
  const initials = assignee
    ? (assignee.name || assignee.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const todos     = Array.isArray(task.todoItems) ? task.todoItems : [];
  const doneTodos = todos.filter(i => i.done).length;
  const todoPct   = todos.length ? Math.round((doneTodos / todos.length) * 100) : 0;
  const editable  = canManage && task.status !== 'completed';

  function handleDelete() {
    if (confirmDelete) deleteTask(task.id);
    else setConfirmDelete(true);
  }

  function handleAddTodo(e) {
    e.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    const updated = [...todos, { id: genId(), text, done: false }];
    editTask(task.id, { todoItems: updated });
    setNewTodoText('');
    addInputRef.current?.focus();
  }

  function handleRemoveTodo(id) {
    const updated = todos.filter(i => i.id !== id);
    editTask(task.id, { todoItems: updated.length ? updated : null });
  }

  function openTodos() {
    setShowTodos(true);
    setTimeout(() => addInputRef.current?.focus(), 50);
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
            {todos.length > 0 && (
              <button
                className="task-todo-badge"
                onClick={() => setShowTodos(v => !v)}
                title="Toggle to-do list"
              >
                ☑ {doneTodos}/{todos.length}
              </button>
            )}
            {todos.length === 0 && editable && (
              <button className="task-todo-init-btn" onClick={openTodos} title="Add to-do list">
                + Add To-Do
              </button>
            )}
          </div>

          {todos.length > 0 && (
            <div className="task-todo-bar-wrap">
              <div className="task-todo-bar">
                <div className="task-todo-fill" style={{ width: `${todoPct}%` }} />
              </div>
              <span className="task-todo-pct">{todoPct}%</span>
            </div>
          )}
        </div>

        <span className={`task-priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>

        {canManage && (
          <div className="task-actions">
            <button className="task-action-btn" onClick={() => onEdit(task)} title="Edit task">✏️</button>
            <button
              className={`task-action-btn task-delete-btn${confirmDelete ? ' confirming' : ''}`}
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm' : 'Delete'}
            >
              {confirmDelete ? '⚠️' : '🗑️'}
            </button>
          </div>
        )}
      </div>

      {/* ── Expandable to-do list ── */}
      {showTodos && (
        <div className="task-todo-list">
          {todos.map(item => (
            <div key={item.id} className={`task-todo-item${item.done ? ' done' : ''}`}>
              <button
                className={`task-todo-check${item.done ? ' checked' : ''}`}
                onClick={() => toggleTaskTodo(task.id, item.id)}
                disabled={task.status === 'completed'}
                title="Toggle item"
              >
                {item.done && '✓'}
              </button>
              <span className="task-todo-text">{item.text}</span>
              {editable && (
                <button
                  className="task-todo-remove"
                  onClick={() => handleRemoveTodo(item.id)}
                  title="Remove item"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Inline add-item row */}
          {editable && (
            <form className="task-todo-add-row" onSubmit={handleAddTodo}>
              <input
                ref={addInputRef}
                className="task-todo-add-input"
                placeholder="Add an item…"
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
                maxLength={200}
              />
              <button
                type="submit"
                className="task-todo-add-submit"
                disabled={!newTodoText.trim()}
                title="Add item"
              >
                +
              </button>
            </form>
          )}
        </div>
      )}

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

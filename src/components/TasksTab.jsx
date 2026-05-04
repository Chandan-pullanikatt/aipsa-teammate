import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import TaskCard from './TaskCard';
import Modal from './Modal';
import './TasksTab.css';

export default function TasksTab({ groupId, schoolId }) {
  const { getGroupTasks, getGroupMembers, addTask, canCreateTasks } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', assignedTo: '', dueDate: '', priority: 'medium' });
  const [error, setError] = useState('');

  const tasks = getGroupTasks(groupId);
  const members = getGroupMembers(groupId);
  const canAdd = canCreateTasks(schoolId);

  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Task title is required'); return; }
    if (!form.assignedTo) { setError('Please assign this task to someone'); return; }
    if (!form.dueDate) { setError('Please set a due date'); return; }
    addTask(groupId, { title: form.title.trim(), assignedTo: form.assignedTo, dueDate: form.dueDate, priority: form.priority });
    setForm({ title: '', assignedTo: '', dueDate: '', priority: 'medium' });
    setError('');
    setShowModal(false);
  }

  function Section({ title, items }) {
    if (items.length === 0) return null;
    return (
      <div className="tasks-section">
        <h4 className="tasks-section-title">{title} <span className="tasks-count">{items.length}</span></h4>
        <div className="tasks-list">
          {items.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-tab">
      <div className="tasks-content">
        {tasks.length === 0 && (
          <div className="tasks-empty">No tasks yet. {canAdd && 'Click + to add one.'}</div>
        )}

        {tasks.length > 0 && (
          <>
            <Section title="All Tasks" items={tasks} />
            <Section title="Pending" items={pending} />
            <Section title="Completed" items={completed} />
          </>
        )}
      </div>

      {canAdd && (
        <button className="tasks-fab" onClick={() => setShowModal(true)} aria-label="Add task">
          +
        </button>
      )}

      {showModal && (
        <Modal title="Add Task" onClose={() => { setShowModal(false); setError(''); }}>
          {error && <div className="ob-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="task-form">
            <div className="task-form-field">
              <label>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                autoFocus
              />
            </div>
            <div className="task-form-field">
              <label>Assign To *</label>
              <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                <option value="">Select a member</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="task-form-row">
              <div className="task-form-field">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="task-form-field">
                <label>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="task-form-actions">
              <button type="button" className="task-form-cancel" onClick={() => { setShowModal(false); setError(''); }}>
                Cancel
              </button>
              <button type="submit" className="task-form-submit">Create Task</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

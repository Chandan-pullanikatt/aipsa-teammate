import { useState } from 'react';
import { useApp } from '../context/AppContext';
import TaskCard from './TaskCard';
import Modal from './Modal';
import './TasksTab.css';

const FILTERS = ['pending', 'completed', 'all'];

function Section({ title, items, onEdit, canManage }) {
  if (items.length === 0) return null;
  return (
    <div className="tasks-section">
      <h4 className="tasks-section-title">
        {title} <span className="tasks-count">{items.length}</span>
      </h4>
      <div className="tasks-list">
        {items.map(t => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} canManage={canManage} />
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = { title: '', assignedTo: '', dueDate: '', priority: 'medium' };

export default function TasksTab({ groupId, schoolId }) {
  const { getGroupTasks, getGroupMembers, addTask, editTask, canCreateTasks } = useApp();
  const [filter, setFilter] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const tasks = getGroupTasks(groupId);
  const members = getGroupMembers(groupId);
  const canManage = canCreateTasks(schoolId);

  const pending   = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');
  const visible   = filter === 'all' ? tasks : filter === 'pending' ? pending : completed;

  function openAdd() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setForm({
      title:      task.title,
      assignedTo: task.assignedTo,
      dueDate:    task.dueDate,
      priority:   task.priority,
    });
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingTask(null);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    if (!form.assignedTo)   { setError('Please assign this task to a member.'); return; }
    if (!form.dueDate)      { setError('Please set a due date.'); return; }

    if (editingTask) {
      editTask(editingTask.id, {
        title:      form.title.trim(),
        assignedTo: form.assignedTo,
        dueDate:    form.dueDate,
        priority:   form.priority,
      });
    } else {
      addTask(groupId, {
        title:      form.title.trim(),
        assignedTo: form.assignedTo,
        dueDate:    form.dueDate,
        priority:   form.priority,
      });
    }
    closeModal();
  }

  return (
    <div className="tasks-tab">
      {/* Filter bar */}
      <div className="tasks-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`tasks-filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all'       ? `All (${tasks.length})`       : null}
            {f === 'pending'   ? `Pending (${pending.length})`   : null}
            {f === 'completed' ? `Completed (${completed.length})` : null}
          </button>
        ))}
      </div>

      <div className="tasks-content">
        {visible.length === 0 && (
          <div className="tasks-empty">
            {filter === 'pending'   && 'No pending tasks.'}
            {filter === 'completed' && 'No completed tasks yet.'}
            {filter === 'all'       && 'No tasks in this group yet.'}
            {canManage && filter !== 'completed' && ' Click + to add one.'}
          </div>
        )}
        {filter === 'all' ? (
          <>
            <Section title="Pending"   items={pending}   onEdit={openEdit} canManage={canManage} />
            <Section title="Completed" items={completed} onEdit={openEdit} canManage={canManage} />
          </>
        ) : (
          <Section title={filter === 'pending' ? 'Pending' : 'Completed'} items={visible} onEdit={openEdit} canManage={canManage} />
        )}
      </div>

      {canManage && (
        <button className="tasks-fab" onClick={openAdd} aria-label="Add task">+</button>
      )}

      {showModal && (
        <Modal
          title={editingTask ? 'Edit Task' : 'New Task'}
          onClose={closeModal}
        >
          {error && <div className="ob-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="task-form">
            <div className="task-form-field">
              <label>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="task-form-field">
              <label>Assign To *</label>
              <select
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
              >
                <option value="">Select a member</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email}
                  </option>
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
                />
              </div>
              <div className="task-form-field">
                <label>Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="task-form-actions">
              <button type="button" className="task-form-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="task-form-submit">
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

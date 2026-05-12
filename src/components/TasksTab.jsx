import { useState } from 'react';
import { useApp } from '../context/AppContext';
import TaskCard from './TaskCard';
import Modal from './Modal';
import './TasksTab.css';

const FILTERS = ['pending', 'completed', 'all'];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

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

const EMPTY_FORM = { title: '', assignedTo: [], dueDate: '', priority: 'medium', todoItems: [] };

export default function TasksTab({ groupId, schoolId }) {
  const { getGroupTasks, getGroupMembers, addTask, editTask, canCreateTasks, getSchoolMembers } = useApp();
  const [filter, setFilter] = useState('pending');
  const [showModal, setShowModal]   = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState('');

  const tasks    = getGroupTasks(groupId);
  const members  = getGroupMembers(groupId);
  const canManage = canCreateTasks(schoolId);

  const pending   = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');
  const visible   = filter === 'all' ? tasks : filter === 'pending' ? pending : completed;

  function openAdd() {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, dueDate: todayISO() });
    setError('');
    setShowModal(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setForm({
      title:      task.title,
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []),
      dueDate:    task.dueDate ? task.dueDate.toString().split('T')[0] : '',
      priority:   task.priority,
      todoItems:  Array.isArray(task.todoItems) ? task.todoItems.map(i => ({ ...i })) : [],
    });
    setError('');
    setShowModal(true);
  }

  function toggleAssignee(id) {
    setForm(f => {
      const current = Array.isArray(f.assignedTo) ? f.assignedTo : [];
      const next = current.includes(id) ? current.filter(uid => uid !== id) : [...current, id];
      return { ...f, assignedTo: next };
    });
  }

  function selectAllTeachers() {
    const schoolMembers = getSchoolMembers(schoolId);
    const teacherIds = schoolMembers.filter(m => m.role === 'Teacher').map(m => m.user.id);
    const groupMemberIds = members.map(m => m.id);
    const targetIds = teacherIds.filter(id => groupMemberIds.includes(id));
    setForm(f => ({ ...f, assignedTo: [...new Set([...f.assignedTo, ...targetIds])] }));
  }

  // ── Todo item helpers ──
  function addTodoItem() {
    setForm(f => ({ ...f, todoItems: [...f.todoItems, { id: genId(), text: '', done: false }] }));
  }

  function updateTodoItem(id, text) {
    setForm(f => ({ ...f, todoItems: f.todoItems.map(i => i.id === id ? { ...i, text } : i) }));
  }

  function removeTodoItem(id) {
    setForm(f => ({ ...f, todoItems: f.todoItems.filter(i => i.id !== id) }));
  }

  function closeModal() {
    setShowModal(false);
    setEditingTask(null);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    if (!form.assignedTo?.length) { setError('Please assign this task to at least one member.'); return; }
    if (!form.dueDate) { setError('Please set a due date.'); return; }

    const todoItems = form.todoItems.filter(i => i.text.trim());

    if (editingTask) {
      editTask(editingTask.id, {
        title:      form.title.trim(),
        assignedTo: form.assignedTo,
        dueDate:    form.dueDate,
        priority:   form.priority,
        todoItems:  todoItems.length ? todoItems : null,
      });
    } else {
      addTask(groupId, {
        title:      form.title.trim(),
        assignedTo: form.assignedTo,
        dueDate:    form.dueDate,
        priority:   form.priority,
        todoItems:  todoItems.length ? todoItems : undefined,
      });
    }
    closeModal();
  }

  return (
    <div className="tasks-tab">
      <div className="tasks-filter-bar">
        {FILTERS.map(f => (
          <button key={f} className={`tasks-filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all'       ? `All (${tasks.length})`         : null}
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
        <Modal title={editingTask ? 'Edit Task' : 'New Task'} onClose={closeModal}>
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
              <div className="sidebar-member-selection">
                <div className="sms-shortcuts">
                  <button type="button" onClick={selectAllTeachers}>Select All Teachers</button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, assignedTo: [] }))}>Clear All</button>
                </div>
                <div className="sms-list" style={{ maxHeight: '140px' }}>
                  {members.map(m => (
                    <label key={m.id} className="sms-item">
                      <input
                        type="checkbox"
                        checked={form.assignedTo.includes(m.id)}
                        onChange={() => toggleAssignee(m.id)}
                      />
                      <span className="sms-name">{m.name || m.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="task-form-row">
              <div className="task-form-field">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={form.dueDate}
                  min={todayISO()}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
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

            {/* ── Optional To-Do List ── */}
            <div className="task-form-field">
              <div className="task-todo-form-header">
                <label>To-Do List <span className="tf-optional">(optional)</span></label>
                <button type="button" className="task-todo-add-btn" onClick={addTodoItem}>+ Add Item</button>
              </div>
              {form.todoItems.length > 0 && (
                <div className="task-todo-form-list">
                  {form.todoItems.map((item, idx) => (
                    <div key={item.id} className="task-todo-form-row">
                      <span className="task-todo-form-num">{idx + 1}.</span>
                      <input
                        type="text"
                        className="task-todo-form-input"
                        placeholder={`To-do item ${idx + 1}`}
                        value={item.text}
                        onChange={e => updateTodoItem(item.id, e.target.value)}
                        maxLength={200}
                      />
                      <button type="button" className="task-todo-form-del" onClick={() => removeTodoItem(item.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="task-form-actions">
              <button type="button" className="task-form-cancel" onClick={closeModal}>Cancel</button>
              <button type="submit" className="task-form-submit">{editingTask ? 'Save Changes' : 'Create Task'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

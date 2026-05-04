import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import './Sidebar.css';

export default function Sidebar({ schoolId, selectedGroupId, onSelectGroup }) {
  const { schools, getGroupsForUser, canCreateGroups, addGroup } = useApp();
  const school = schools.find(s => s.id === schoolId);
  const groups = getGroupsForUser(schoolId);
  const canAdd = canCreateGroups(schoolId);

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');

  const topLevel = groups.filter(g => !g.parentId);
  const childrenOf = (pid) => groups.filter(g => g.parentId === pid);

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    addGroup(schoolId, newName.trim(), newParent || null);
    setNewName('');
    setNewParent('');
    setShowModal(false);
  }

  function GroupItem({ group, depth = 0 }) {
    const children = childrenOf(group.id);
    const isActive = selectedGroupId === group.id;
    return (
      <>
        <button
          className={`sidebar-group${isActive ? ' active' : ''}`}
          style={{ paddingLeft: `${1 + depth * 1}rem` }}
          onClick={() => onSelectGroup(group)}
        >
          {depth > 0 && <span className="sidebar-indent-bar" />}
          <span className="sidebar-group-name">{group.name}</span>
        </button>
        {children.map(child => (
          <GroupItem key={child.id} group={child} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-school-header">
        <span className="sidebar-school-name">{school?.name || 'School'}</span>
      </div>

      <div className="sidebar-groups">
        {topLevel.length === 0 && (
          <p className="sidebar-empty">No groups yet.</p>
        )}
        {topLevel.map(g => <GroupItem key={g.id} group={g} />)}
      </div>

      {canAdd && (
        <div className="sidebar-footer">
          <button className="sidebar-add-btn" onClick={() => setShowModal(true)}>
            + New Group
          </button>
        </div>
      )}

      {showModal && (
        <Modal title="Create Group" onClose={() => setShowModal(false)} width={400}>
          <form onSubmit={handleAdd} className="sidebar-new-form">
            <div className="ob-field">
              <label>Group Name *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Science Lab"
                autoFocus
              />
            </div>
            <div className="ob-field">
              <label>Parent Group (optional)</label>
              <select value={newParent} onChange={e => setNewParent(e.target.value)}>
                <option value="">None (top-level)</option>
                {topLevel.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="task-form-actions" style={{ paddingTop: '0.5rem' }}>
              <button type="button" className="task-form-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="task-form-submit">Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

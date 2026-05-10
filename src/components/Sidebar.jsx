import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import './Sidebar.css';

export default function Sidebar({ schoolId, selectedGroupId, onSelectGroup }) {
  const { schools, getGroupsForUser, canCreateGroups, addGroup, renameGroup, deleteGroup, getRoleInSchool, getSchoolMembers } = useApp();
  const school = schools.find(s => s.id === schoolId);
  const groups = getGroupsForUser(schoolId);
  const canAdd = canCreateGroups(schoolId);
  const isAdmin = canAdd; // same permission — Owner/Admin

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');

  // Rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirm state
  const [deletingId, setDeletingId] = useState(null);

  const topLevel = groups.filter(g => !g.parentId);
  const childrenOf = (pid) => groups.filter(g => g.parentId === pid);

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const schoolMembers = getSchoolMembers(schoolId);

  function toggleUser(id) {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  }

  function selectAllTeachers() {
    const teacherIds = schoolMembers.filter(m => m.role === 'Teacher').map(m => m.user.id);
    setSelectedUserIds(prev => [...new Set([...prev, ...teacherIds])]);
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    addGroup(schoolId, newName.trim(), newParent || null, selectedUserIds);
    setNewName('');
    setNewParent('');
    setSelectedUserIds([]);
    setShowAddModal(false);
  }

  function startRename(group, e) {
    e.stopPropagation();
    setRenamingId(group.id);
    setRenameValue(group.name);
    setDeletingId(null);
  }

  function submitRename(groupId) {
    if (renameValue.trim()) renameGroup(groupId, renameValue.trim());
    setRenamingId(null);
  }

  function handleRenameKey(e, groupId) {
    if (e.key === 'Enter') submitRename(groupId);
    if (e.key === 'Escape') setRenamingId(null);
  }

  function confirmDelete(groupId, e) {
    e.stopPropagation();
    setDeletingId(prev => (prev === groupId ? null : groupId));
    setRenamingId(null);
  }

  function executeDelete(groupId) {
    if (selectedGroupId === groupId) onSelectGroup(null);
    // Also clear if a child group was selected
    deleteGroup(groupId);
    setDeletingId(null);
  }

  function GroupItem({ group, depth = 0 }) {
    const children = childrenOf(group.id);
    const isActive = selectedGroupId === group.id;
    const isRenaming = renamingId === group.id;
    const isDeleting = deletingId === group.id;

    return (
      <>
        <div
          className={`sidebar-group-row${isActive ? ' active' : ''}${isDeleting ? ' deleting' : ''}`}
          style={{ paddingLeft: `${0.75 + depth * 0.875}rem` }}
        >
          {depth > 0 && <span className="sidebar-indent-bar" />}

          {isRenaming ? (
            <input
              className="sidebar-rename-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => submitRename(group.id)}
              onKeyDown={e => handleRenameKey(e, group.id)}
              autoFocus
              onClick={e => e.stopPropagation()}
              maxLength={60}
            />
          ) : (
            <button
              className="sidebar-group-name-btn"
              onClick={() => onSelectGroup(group)}
              title={group.name}
            >
              {group.name}
            </button>
          )}

          {isAdmin && !isRenaming && (
            <div className="sidebar-group-actions">
              <button
                className="sg-action-btn"
                onClick={e => startRename(group, e)}
                title="Rename group"
                aria-label="Rename"
              >✏️</button>
              <button
                className={`sg-action-btn sg-delete-btn${isDeleting ? ' active' : ''}`}
                onClick={e => confirmDelete(group.id, e)}
                title="Delete group"
                aria-label="Delete"
              >🗑️</button>
            </div>
          )}
        </div>

        {isDeleting && (
          <div className="sidebar-delete-confirm" style={{ paddingLeft: `${0.75 + depth * 0.875 + 0.5}rem` }}>
            <span>Delete "{group.name}"?</span>
            <div className="sdc-actions">
              <button className="sdc-yes" onClick={() => executeDelete(group.id)}>Delete</button>
              <button className="sdc-no" onClick={() => setDeletingId(null)}>Cancel</button>
            </div>
          </div>
        )}

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
          <p className="sidebar-empty">No groups yet.{canAdd ? ' Create one below.' : ''}</p>
        )}
        {topLevel.map(g => <GroupItem key={g.id} group={g} />)}
      </div>

      {canAdd && (
        <div className="sidebar-footer">
          <button className="sidebar-add-btn" onClick={() => setShowAddModal(true)}>
            + New Group
          </button>
        </div>
      )}

      {showAddModal && (
        <Modal title="Create Group" onClose={() => setShowAddModal(false)} width={400}>
          <form onSubmit={handleAdd} className="sidebar-new-form">
            <div className="ob-field">
              <label>Group Name *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Science Lab"
                maxLength={60}
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
            <div className="ob-field">
              <label>Add Members</label>
              <div className="sidebar-member-selection">
                <div className="sms-shortcuts">
                  <button type="button" onClick={selectAllTeachers}>Select All Teachers</button>
                  <button type="button" onClick={() => setSelectedUserIds([])}>Clear All</button>
                </div>
                <div className="sms-list">
                  {schoolMembers.map(({ user, role }) => (
                    <label key={user.id} className="sms-item">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                      />
                      <span className="sms-name">{user.name || user.email}</span>
                      <span className="sms-role">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="task-form-actions" style={{ paddingTop: '0.5rem' }}>
              <button type="button" className="task-form-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="task-form-submit" disabled={!newName.trim()}>Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

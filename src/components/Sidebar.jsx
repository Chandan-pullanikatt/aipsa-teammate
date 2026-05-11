import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import './Sidebar.css';

export default function Sidebar({ schoolId, selectedGroupId, onSelectGroup }) {
  const { schools, getGroupsForUser, canCreateGroups, addGroup, updateGroup, deleteGroup, getSchoolMembers } = useApp();
  const school = schools.find(s => s.id === schoolId);
  const groups = getGroupsForUser(schoolId);
  const canAdd = canCreateGroups(schoolId);
  const isAdmin = canAdd;

  // New group form
  const [showAddModal, setShowAddModal]   = useState(false);
  const [newName,      setNewName]        = useState('');
  const [newDesc,      setNewDesc]        = useState('');
  const [newParent,    setNewParent]      = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const schoolMembers = getSchoolMembers(schoolId);

  // Dropdown — rendered via portal to escape overflow:hidden
  const [openDropdownId,  setOpenDropdownId]  = useState(null);
  const [dropdownGroup,   setDropdownGroup]   = useState(null);
  const [dropdownPos,     setDropdownPos]     = useState({ top: 0, left: 0 });

  // Update modal
  const [editGroup, setEditGroup] = useState(null);
  const [editName,  setEditName]  = useState('');
  const [editDesc,  setEditDesc]  = useState('');

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const topLevel = groups.filter(g => !g.parentId);
  const childrenOf = (pid) => groups.filter(g => g.parentId === pid);

  function toggleUser(id) {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  }

  function selectAllTeachers() {
    const teacherIds = schoolMembers.filter(m => m.role === 'Teacher').map(m => m.user.id);
    setSelectedUserIds(prev => [...new Set([...prev, ...teacherIds])]);
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    addGroup(schoolId, newName.trim(), newParent || null, selectedUserIds, newDesc.trim() || null);
    setNewName(''); setNewDesc(''); setNewParent('');
    setSelectedUserIds([]);
    setShowAddModal(false);
  }

  function closeDropdown() {
    setOpenDropdownId(null);
    setDropdownGroup(null);
  }

  function handleDropdownToggle(e, group) {
    e.stopPropagation();
    if (openDropdownId === group.id) { closeDropdown(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.right - 120 });
    setOpenDropdownId(group.id);
    setDropdownGroup(group);
  }

  function openEditModal(group) {
    closeDropdown();
    setEditGroup(group);
    setEditName(group.name);
    setEditDesc(group.description || '');
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editName.trim() || !editGroup) return;
    await updateGroup(editGroup.id, { name: editName.trim(), description: editDesc.trim() || null });
    setEditGroup(null);
  }

  function handleDeleteClick(groupId) {
    closeDropdown();
    setDeleteConfirmId(groupId);
  }

  function executeDelete(groupId) {
    if (selectedGroupId === groupId) onSelectGroup(null);
    deleteGroup(groupId);
    setDeleteConfirmId(null);
  }

  function GroupItem({ group, depth = 0 }) {
    const children = childrenOf(group.id);
    const isActive = selectedGroupId === group.id;
    const isOpen   = openDropdownId === group.id;

    return (
      <>
        <div
          className={`sidebar-group-row${isActive ? ' active' : ''}`}
          style={{ paddingLeft: `${0.75 + depth * 0.875}rem` }}
        >
          {depth > 0 && <span className="sidebar-indent-bar" />}

          <button
            className="sidebar-group-name-btn"
            onClick={() => onSelectGroup(group)}
            title={group.name}
          >
            {group.name}
          </button>

          {isAdmin && (
            <div className="sidebar-group-actions">
              <button
                className={`sg-action-btn sg-dropdown-btn${isOpen ? ' open' : ''}`}
                onClick={e => handleDropdownToggle(e, group)}
                title="Group options"
              >
                ⋮
              </button>
            </div>
          )}
        </div>

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

      {/* School Overview button */}
      <button
        className={`sidebar-overview-btn${!selectedGroupId ? ' active' : ''}`}
        onClick={() => onSelectGroup(null)}
      >
        🏫 School Overview
      </button>

      <div className="sidebar-section-label">Groups</div>

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

      {/* ── Dropdown portal — rendered at body to escape overflow:hidden ── */}
      {openDropdownId && createPortal(
        <>
          <div className="sg-dropdown-backdrop" onClick={closeDropdown} />
          <div
            className="sg-dropdown-menu"
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          >
            <button onClick={() => openEditModal(dropdownGroup)}>Update</button>
            <button
              className="sg-dropdown-delete"
              onClick={() => handleDeleteClick(openDropdownId)}
            >
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── Create Group Modal ── */}
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
              <label>Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Brief description of this group"
                maxLength={500}
                rows={2}
                className="sidebar-desc-textarea"
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

      {/* ── Update Group Modal ── */}
      {editGroup && (
        <Modal title="Update Group" onClose={() => setEditGroup(null)} width={400}>
          <form onSubmit={handleUpdate} className="sidebar-new-form">
            <div className="ob-field">
              <label>Group Name *</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={60}
                autoFocus
              />
            </div>
            <div className="ob-field">
              <label>Description</label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Brief description of this group"
                maxLength={500}
                rows={3}
                className="sidebar-desc-textarea"
              />
            </div>
            <div className="task-form-actions" style={{ paddingTop: '0.5rem' }}>
              <button type="button" className="task-form-cancel" onClick={() => setEditGroup(null)}>Cancel</button>
              <button type="submit" className="task-form-submit" disabled={!editName.trim()}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmId && (
        <Modal title="Delete Group" onClose={() => setDeleteConfirmId(null)} width={360}>
          <div className="sidebar-delete-modal">
            <p>
              Are you sure you want to delete{' '}
              <strong>"{groups.find(g => g.id === deleteConfirmId)?.name}"</strong>?
            </p>
            <p className="sdm-warning">
              This will permanently delete all messages, tasks, and sub-groups inside it.
            </p>
            <div className="task-form-actions">
              <button type="button" className="task-form-cancel" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button type="button" className="task-form-delete" onClick={() => executeDelete(deleteConfirmId)}>
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

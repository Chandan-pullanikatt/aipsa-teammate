import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const STORAGE = {
  schools: 'tm_schools',
  users: 'tm_users',
  groups: 'tm_groups',
  groupMembers: 'tm_group_members',
  tasks: 'tm_tasks',
  messages: 'tm_messages',
  memberships: 'tm_memberships',
  inviteCodes: 'tm_invite_codes',
  currentUser: 'tm_current_user',
  seeded: 'tm_seeded',
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function genCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 5)}`;
}

const now = Date.now();
const daysMs = (n) => n * 86400000;

const SEED = {
  schools: [
    { id: 'school-x', name: 'School X', address: '123 Education Lane, New Delhi', type: 'Secondary' },
    { id: 'school-y', name: 'School Y', address: '456 Knowledge Park, Mumbai', type: 'Primary' },
  ],
  users: [
    { id: 'user-test', email: 'test@schoolx.com', name: 'Test User' },
    { id: 'user-t1', email: 'teacher1@schoolx.com', name: 'Rahul Sharma' },
    { id: 'user-t2', email: 'teacher2@schoolx.com', name: 'Neha Gupta' },
    { id: 'user-m1', email: 'manager1@schoolx.com', name: 'Anita Singh' },
    { id: 'user-s1', email: 'staff1@schoolx.com', name: 'Deepak Kumar' },
  ],
  memberships: [
    { userId: 'user-test', schoolId: 'school-x', role: 'Owner' },
    { userId: 'user-t1', schoolId: 'school-x', role: 'Teacher' },
    { userId: 'user-t2', schoolId: 'school-x', role: 'Teacher' },
    { userId: 'user-m1', schoolId: 'school-x', role: 'Manager' },
    { userId: 'user-s1', schoolId: 'school-x', role: 'Staff' },
  ],
  inviteCodes: {
    'school-x': { teacher: 'x-123', staff: 'x-273', manager: 'x-573' },
    'school-y': { teacher: 'y-576', staff: 'y-963', manager: 'y-789' },
  },
  groups: [
    { id: 'x-g1', schoolId: 'school-x', name: 'Science Dept', parentId: null },
    { id: 'x-g1-1', schoolId: 'school-x', name: 'Physics', parentId: 'x-g1' },
    { id: 'x-g1-2', schoolId: 'school-x', name: 'Chemistry', parentId: 'x-g1' },
    { id: 'x-g2', schoolId: 'school-x', name: 'Arts Dept', parentId: null },
    { id: 'x-g3', schoolId: 'school-x', name: 'Admin Office', parentId: null },
    { id: 'y-g1', schoolId: 'school-y', name: 'Mathematics', parentId: null },
    { id: 'y-g2', schoolId: 'school-y', name: 'English Dept', parentId: null },
    { id: 'y-g3', schoolId: 'school-y', name: 'Staff Room', parentId: null },
  ],
  groupMembers: [
    { userId: 'user-test', groupId: 'x-g1' },
    { userId: 'user-test', groupId: 'x-g1-1' },
    { userId: 'user-test', groupId: 'x-g1-2' },
    { userId: 'user-test', groupId: 'x-g2' },
    { userId: 'user-test', groupId: 'x-g3' },
    { userId: 'user-t1', groupId: 'x-g1' },
    { userId: 'user-t1', groupId: 'x-g1-1' },
    { userId: 'user-t2', groupId: 'x-g1' },
    { userId: 'user-t2', groupId: 'x-g1-2' },
    { userId: 'user-m1', groupId: 'x-g3' },
    { userId: 'user-s1', groupId: 'x-g3' },
  ],
  tasks: [
    { id: 'tk1', groupId: 'x-g1', title: 'Prepare quarterly science report', assignedTo: 'user-t1', dueDate: new Date(now + daysMs(7)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk2', groupId: 'x-g1', title: 'Review lab equipment inventory', assignedTo: 'user-t2', dueDate: new Date(now + daysMs(14)).toISOString().slice(0,10), priority: 'medium', status: 'pending', createdBy: 'user-test' },
    { id: 'tk3', groupId: 'x-g1', title: 'Update curriculum documents', assignedTo: 'user-test', dueDate: new Date(now - daysMs(2)).toISOString().slice(0,10), priority: 'low', status: 'completed', createdBy: 'user-test' },
    { id: 'tk4', groupId: 'x-g1', title: 'Organize science fair registration', assignedTo: 'user-t1', dueDate: new Date(now - daysMs(5)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk5', groupId: 'x-g1-1', title: 'Set up optics lab experiment', assignedTo: 'user-t1', dueDate: new Date(now + daysMs(3)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk6', groupId: 'x-g1-1', title: 'Grade mid-term physics papers', assignedTo: 'user-t1', dueDate: new Date(now + daysMs(5)).toISOString().slice(0,10), priority: 'medium', status: 'pending', createdBy: 'user-test' },
    { id: 'tk7', groupId: 'x-g1-1', title: 'Order new textbooks', assignedTo: 'user-test', dueDate: new Date(now + daysMs(20)).toISOString().slice(0,10), priority: 'low', status: 'completed', createdBy: 'user-test' },
    { id: 'tk8', groupId: 'x-g1-2', title: 'Replenish chemical reagents', assignedTo: 'user-t2', dueDate: new Date(now + daysMs(2)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk9', groupId: 'x-g1-2', title: 'Submit safety inspection report', assignedTo: 'user-test', dueDate: new Date(now - daysMs(1)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk10', groupId: 'x-g1-2', title: 'Update lab procedures manual', assignedTo: 'user-t2', dueDate: new Date(now + daysMs(10)).toISOString().slice(0,10), priority: 'medium', status: 'completed', createdBy: 'user-test' },
    { id: 'tk11', groupId: 'x-g2', title: 'Organize annual art exhibition', assignedTo: 'user-test', dueDate: new Date(now + daysMs(30)).toISOString().slice(0,10), priority: 'medium', status: 'pending', createdBy: 'user-test' },
    { id: 'tk12', groupId: 'x-g2', title: 'Purchase art supplies', assignedTo: 'user-test', dueDate: new Date(now + daysMs(7)).toISOString().slice(0,10), priority: 'low', status: 'pending', createdBy: 'user-test' },
    { id: 'tk13', groupId: 'x-g2', title: 'Submit grant application', assignedTo: 'user-test', dueDate: new Date(now - daysMs(3)).toISOString().slice(0,10), priority: 'high', status: 'completed', createdBy: 'user-test' },
    { id: 'tk14', groupId: 'x-g3', title: 'Update student records system', assignedTo: 'user-m1', dueDate: new Date(now + daysMs(5)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk15', groupId: 'x-g3', title: 'Prepare monthly attendance report', assignedTo: 'user-m1', dueDate: new Date(now + daysMs(2)).toISOString().slice(0,10), priority: 'medium', status: 'pending', createdBy: 'user-test' },
    { id: 'tk16', groupId: 'x-g3', title: 'Coordinate parent-teacher meeting', assignedTo: 'user-test', dueDate: new Date(now + daysMs(14)).toISOString().slice(0,10), priority: 'high', status: 'pending', createdBy: 'user-test' },
    { id: 'tk17', groupId: 'x-g3', title: 'File term reports', assignedTo: 'user-m1', dueDate: new Date(now - daysMs(7)).toISOString().slice(0,10), priority: 'medium', status: 'completed', createdBy: 'user-test' },
  ],
  messages: [
    { id: 'mg1', groupId: 'x-g1', senderId: 'user-test', senderName: 'Test User', content: 'Good morning! Please review the quarterly report draft.', timestamp: new Date(now - 5*3600000).toISOString() },
    { id: 'mg2', groupId: 'x-g1', senderId: 'user-t1', senderName: 'Rahul Sharma', content: "Reviewed it. The lab equipment section needs updating.", timestamp: new Date(now - 4*3600000).toISOString() },
    { id: 'mg3', groupId: 'x-g1', senderId: 'user-t2', senderName: 'Neha Gupta', content: 'We need to include new safety protocols in the appendix.', timestamp: new Date(now - 3*3600000).toISOString() },
    { id: 'mg4', groupId: 'x-g1', senderId: 'user-test', senderName: 'Test User', content: "Good points! Adding those sections before EOD.", timestamp: new Date(now - 2*3600000).toISOString() },
    { id: 'mg5', groupId: 'x-g1', senderId: 'user-t1', senderName: 'Rahul Sharma', content: 'Science fair deadline is this Friday. Please remind students.', timestamp: new Date(now - 3600000).toISOString() },
    { id: 'mg6', groupId: 'x-g1', senderId: 'user-test', senderName: 'Test User', content: "Will do! Sending a circular to all class teachers.", timestamp: new Date(now - 1800000).toISOString() },
    { id: 'mg7', groupId: 'x-g1-1', senderId: 'user-t1', senderName: 'Rahul Sharma', content: 'Optics experiment is set up in Lab 3. Students start tomorrow.', timestamp: new Date(now - 3*7200000).toISOString() },
    { id: 'mg8', groupId: 'x-g1-1', senderId: 'user-test', senderName: 'Test User', content: 'Great! Make sure all safety equipment is in place.', timestamp: new Date(now - 2*7200000).toISOString() },
    { id: 'mg9', groupId: 'x-g1-1', senderId: 'user-t1', senderName: 'Rahul Sharma', content: 'Done. Observation sheets are ready for students.', timestamp: new Date(now - 7200000).toISOString() },
    { id: 'mg10', groupId: 'x-g1-1', senderId: 'user-test', senderName: 'Test User', content: 'Mid-term grades due by Friday.', timestamp: new Date(now - 3600000).toISOString() },
    { id: 'mg11', groupId: 'x-g1-1', senderId: 'user-t1', senderName: 'Rahul Sharma', content: "Will have them ready by Thursday.", timestamp: new Date(now - 1200000).toISOString() },
    { id: 'mg12', groupId: 'x-g1-2', senderId: 'user-t2', senderName: 'Neha Gupta', content: 'Urgent: Running low on sodium chloride and HCl.', timestamp: new Date(now - 86400000).toISOString() },
    { id: 'mg13', groupId: 'x-g1-2', senderId: 'user-test', senderName: 'Test User', content: 'Purchase order raised. Delivery in 2 days.', timestamp: new Date(now - 82800000).toISOString() },
    { id: 'mg14', groupId: 'x-g1-2', senderId: 'user-t2', senderName: 'Neha Gupta', content: 'Thanks! Also — safety inspection is overdue.', timestamp: new Date(now - 43200000).toISOString() },
    { id: 'mg15', groupId: 'x-g1-2', senderId: 'user-test', senderName: 'Test User', content: "Submitting the inspection report today.", timestamp: new Date(now - 7200000).toISOString() },
    { id: 'mg16', groupId: 'x-g1-2', senderId: 'user-t2', senderName: 'Neha Gupta', content: 'Lab procedures manual has been updated. Please review.', timestamp: new Date(now - 3600000).toISOString() },
    { id: 'mg17', groupId: 'x-g2', senderId: 'user-test', senderName: 'Test User', content: 'Exhibition planning started. Theme: "Nature & Tech".', timestamp: new Date(now - 172800000).toISOString() },
    { id: 'mg18', groupId: 'x-g2', senderId: 'user-test', senderName: 'Test User', content: 'Art supplies order placed. Delivery next week.', timestamp: new Date(now - 86400000).toISOString() },
    { id: 'mg19', groupId: 'x-g2', senderId: 'user-test', senderName: 'Test User', content: 'Grant application submitted!', timestamp: new Date(now - 43200000).toISOString() },
    { id: 'mg20', groupId: 'x-g2', senderId: 'user-test', senderName: 'Test User', content: 'Venue booked for last weekend of the month.', timestamp: new Date(now - 7200000).toISOString() },
    { id: 'mg21', groupId: 'x-g2', senderId: 'user-test', senderName: 'Test User', content: 'Collect student artwork submissions by next Monday.', timestamp: new Date(now - 1800000).toISOString() },
    { id: 'mg22', groupId: 'x-g3', senderId: 'user-m1', senderName: 'Anita Singh', content: 'Monthly attendance report ready by tomorrow afternoon.', timestamp: new Date(now - 86400000).toISOString() },
    { id: 'mg23', groupId: 'x-g3', senderId: 'user-test', senderName: 'Test User', content: 'Please include department-wise breakdown this time.', timestamp: new Date(now - 79200000).toISOString() },
    { id: 'mg24', groupId: 'x-g3', senderId: 'user-m1', senderName: 'Anita Singh', content: 'Template updated accordingly.', timestamp: new Date(now - 72000000).toISOString() },
    { id: 'mg25', groupId: 'x-g3', senderId: 'user-test', senderName: 'Test User', content: 'Parent-teacher meeting on the 20th. Please prep hall allocation.', timestamp: new Date(now - 43200000).toISOString() },
    { id: 'mg26', groupId: 'x-g3', senderId: 'user-m1', senderName: 'Anita Singh', content: 'Halls 1 and 2 booked. Confirmation sent to all teachers.', timestamp: new Date(now - 3600000).toISOString() },
  ],
};

function loadInitialState() {
  if (!localStorage.getItem(STORAGE.seeded)) {
    Object.entries(SEED).forEach(([key, val]) => {
      localStorage.setItem(STORAGE[key], JSON.stringify(val));
    });
    localStorage.setItem(STORAGE.currentUser, JSON.stringify(SEED.users[0]));
    localStorage.setItem(STORAGE.seeded, 'true');
    return { ...SEED, currentUser: SEED.users[0] };
  }
  return {
    schools: JSON.parse(localStorage.getItem(STORAGE.schools) || '[]'),
    users: JSON.parse(localStorage.getItem(STORAGE.users) || '[]'),
    groups: JSON.parse(localStorage.getItem(STORAGE.groups) || '[]'),
    groupMembers: JSON.parse(localStorage.getItem(STORAGE.groupMembers) || '[]'),
    tasks: JSON.parse(localStorage.getItem(STORAGE.tasks) || '[]'),
    messages: JSON.parse(localStorage.getItem(STORAGE.messages) || '[]'),
    memberships: JSON.parse(localStorage.getItem(STORAGE.memberships) || '[]'),
    inviteCodes: JSON.parse(localStorage.getItem(STORAGE.inviteCodes) || '{}'),
    currentUser: JSON.parse(localStorage.getItem(STORAGE.currentUser) || 'null'),
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitialState);

  function update(partial) {
    Object.entries(partial).forEach(([key, val]) => {
      if (STORAGE[key]) localStorage.setItem(STORAGE[key], JSON.stringify(val));
    });
    setState(prev => ({ ...prev, ...partial }));
  }

  function login(email) {
    let user = state.users.find(u => u.email === email);
    if (!user) {
      user = { id: `user-${genId()}`, email, name: email.split('@')[0] };
      update({ users: [...state.users, user], currentUser: user });
    } else {
      update({ currentUser: user });
    }
    localStorage.setItem(STORAGE.currentUser, JSON.stringify(user));
    return user;
  }

  function logout() {
    localStorage.setItem(STORAGE.currentUser, 'null');
    setState(prev => ({ ...prev, currentUser: null }));
  }

  function getRoleInSchool(schoolId, userId) {
    const uid = userId || state.currentUser?.id;
    const m = state.memberships.find(m => m.userId === uid && m.schoolId === schoolId);
    return m?.role || null;
  }

  function getCurrentUserSchools() {
    if (!state.currentUser) return [];
    return state.memberships
      .filter(m => m.userId === state.currentUser.id)
      .map(m => ({ school: state.schools.find(s => s.id === m.schoolId), role: m.role }))
      .filter(m => m.school);
  }

  function getGroupsForUser(schoolId) {
    if (!state.currentUser || !schoolId) return [];
    const role = getRoleInSchool(schoolId);
    if (role === 'Owner' || role === 'Admin') {
      return state.groups.filter(g => g.schoolId === schoolId);
    }
    const myGroupIds = state.groupMembers.filter(gm => gm.userId === state.currentUser.id).map(gm => gm.groupId);
    return state.groups.filter(g => g.schoolId === schoolId && myGroupIds.includes(g.id));
  }

  function getGroupMembers(groupId) {
    const ids = state.groupMembers.filter(gm => gm.groupId === groupId).map(gm => gm.userId);
    return state.users.filter(u => ids.includes(u.id));
  }

  function getGroupMessages(groupId) {
    return state.messages
      .filter(m => m.groupId === groupId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  function getGroupTasks(groupId) {
    return state.tasks.filter(t => t.groupId === groupId);
  }

  function addMessage(groupId, content, extra = {}) {
    if (!state.currentUser) return;
    const msg = {
      id: `msg-${genId()}`, groupId,
      senderId: state.currentUser.id,
      senderName: state.currentUser.name,
      content, timestamp: new Date().toISOString(),
      type: 'text',
      ...extra,
    };
    update({ messages: [...state.messages, msg] });
    return msg;
  }

  function voteOnPoll(msgId, optionId) {
    if (!state.currentUser) return;
    const uid = state.currentUser.id;
    const newMessages = state.messages.map(m => {
      if (m.id !== msgId || m.type !== 'poll') return m;
      return {
        ...m,
        pollOptions: m.pollOptions.map(opt => {
          const votes = opt.votes.filter(v => v !== uid);
          if (opt.id === optionId) votes.push(uid);
          return { ...opt, votes };
        }),
      };
    });
    update({ messages: newMessages });
  }

  function toggleTodoItem(msgId, itemId) {
    const newMessages = state.messages.map(m => {
      if (m.id !== msgId || m.type !== 'todo') return m;
      return {
        ...m,
        todoItems: m.todoItems.map(it =>
          it.id === itemId ? { ...it, done: !it.done } : it
        ),
      };
    });
    update({ messages: newMessages });
  }

  function addTask(groupId, taskData) {
    if (!state.currentUser) return;
    const task = { id: `tk-${genId()}`, groupId, ...taskData, status: 'pending', createdBy: state.currentUser.id };
    update({ tasks: [...state.tasks, task] });
  }

  function toggleTask(taskId) {
    update({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
      ),
    });
  }

  function addGroup(schoolId, name, parentId = null) {
    const group = { id: `grp-${genId()}`, schoolId, name, parentId };
    const newGroups = [...state.groups, group];
    const newGMs = [...state.groupMembers];
    if (state.currentUser) newGMs.push({ userId: state.currentUser.id, groupId: group.id });
    update({ groups: newGroups, groupMembers: newGMs });
    return group;
  }

  function joinSchool(code) {
    const map = {};
    Object.entries(state.inviteCodes).forEach(([schoolId, codes]) => {
      Object.entries(codes).forEach(([roleName, c]) => {
        map[c] = { schoolId, role: roleName.charAt(0).toUpperCase() + roleName.slice(1) };
      });
    });
    const match = map[code];
    if (!match) return { success: false, error: 'Invalid invite code' };
    if (!state.currentUser) return { success: false, error: 'Not logged in' };
    if (state.memberships.find(m => m.userId === state.currentUser.id && m.schoolId === match.schoolId)) {
      return { success: false, error: 'Already a member of this school' };
    }
    const newMemberships = [...state.memberships, { userId: state.currentUser.id, schoolId: match.schoolId, role: match.role }];
    const schoolGroups = state.groups.filter(g => g.schoolId === match.schoolId);
    const newGMs = [...state.groupMembers];
    schoolGroups.forEach(g => newGMs.push({ userId: state.currentUser.id, groupId: g.id }));
    update({ memberships: newMemberships, groupMembers: newGMs });
    return { success: true, schoolId: match.schoolId };
  }

  function registerSchool(name, address, type) {
    if (!state.currentUser) return null;
    const schoolId = `school-${genId()}`;
    const school = { id: schoolId, name, address, type };
    const newSchools = [...state.schools, school];
    const newMemberships = [...state.memberships, { userId: state.currentUser.id, schoolId, role: 'Owner' }];
    const newCodes = {
      ...state.inviteCodes,
      [schoolId]: { teacher: genCode('t'), staff: genCode('s'), manager: genCode('m') },
    };
    update({ schools: newSchools, memberships: newMemberships, inviteCodes: newCodes });
    return school;
  }

  function updateSchool(schoolId, edits) {
    update({ schools: state.schools.map(s => s.id === schoolId ? { ...s, ...edits } : s) });
  }

  function regenerateCode(schoolId, roleKey) {
    const prefix = { teacher: 't', staff: 's', manager: 'm' }[roleKey] || 'x';
    update({
      inviteCodes: {
        ...state.inviteCodes,
        [schoolId]: { ...(state.inviteCodes[schoolId] || {}), [roleKey]: genCode(prefix) },
      },
    });
  }

  function getUserById(id) {
    return state.users.find(u => u.id === id);
  }

  function canCreateTasks(schoolId) {
    return ['Owner', 'Admin', 'Manager', 'Teacher'].includes(getRoleInSchool(schoolId));
  }

  function canCreateGroups(schoolId) {
    return ['Owner', 'Admin'].includes(getRoleInSchool(schoolId));
  }

  return (
    <AppContext.Provider value={{
      ...state,
      login, logout,
      getRoleInSchool,
      getCurrentUserSchools,
      getGroupsForUser,
      getGroupMembers,
      getGroupMessages,
      getGroupTasks,
      addMessage, voteOnPoll, toggleTodoItem, addTask, toggleTask,
      addGroup, joinSchool, registerSchool,
      updateSchool, regenerateCode,
      getUserById, canCreateTasks, canCreateGroups,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;

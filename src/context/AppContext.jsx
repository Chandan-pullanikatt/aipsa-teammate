import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ── Initial state ────────────────────────────────────────────

const INITIAL = {
  currentUser:  null,
  schools:      [],
  users:        [],
  groups:       [],
  groupMembers: [],
  tasks:        [],
  memberships:  [],
  inviteCodes:  {},
  notifications: [],
  theme:        localStorage.getItem('tm_theme') || 'light',
  loading:      true,
};

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const taskListenersAttached = useRef(false);

  // ── Load all data for a signed-in user ─────────────────────

  async function loadUserData(silent = false) {
    const fallbackTimeout = silent ? null : setTimeout(() => {
      setState(prev => {
        if (!prev.loading) return prev;
        return { ...prev, loading: false };
      });
    }, 8000);

    try {
      if (!silent) setState(prev => ({ ...prev, loading: true }));

      const { data } = await api.get('/app/bootstrap');
      const { user, schools, memberships, groups, groupMembers, tasks, users, inviteCodes, notifications } = data;

      setState(prev => ({
        ...prev,
        currentUser:  user,
        schools,
        memberships,
        groups,
        groupMembers,
        tasks,
        users,
        inviteCodes,
        notifications: notifications || [],
      }));

      // Subscribe to real-time updates
      const groupIds = groups.map(g => g.id);
      const sIds = schools.map(s => s.id);
      subscribeToRealtime(groupIds, sIds);

    } catch (err) {
      console.error('loadUserData error:', err?.message || err);
      setState(prev => ({
        ...prev,
        loadError: err?.message || 'Failed to load data',
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    }
  }

  // ── Socket.IO — real-time sync ──────────────────────────

  function subscribeToRealtime(groupIds, schoolIds = []) {
    const socket = getSocket();
    if (!socket) return;

    if (groupIds.length) socket.emit('join:tasks', groupIds);
    if (schoolIds.length) {
      schoolIds.forEach(sid => socket.emit('join:school', sid));
    }

    // Only attach listeners once per session to avoid duplicates
    if (taskListenersAttached.current) return;
    taskListenersAttached.current = true;

    socket.on('task:created', (task) => {
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.some(t => t.id === task.id) ? prev.tasks : [...prev.tasks, task],
      }));
    });

    socket.on('task:updated', (task) => {
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === task.id ? task : t),
      }));
    });

    socket.on('task:deleted', ({ id }) => {
      setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
    });

    socket.on('notification:created', (notif) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.some(n => n.id === notif.id) ? prev.notifications : [notif, ...prev.notifications],
      }));
    });

    socket.on('membership:created', (m) => {
      setState(prev => ({
        ...prev,
        memberships: prev.memberships.some(em => em.userId === m.userId && em.schoolId === m.schoolId) 
          ? prev.memberships 
          : [...prev.memberships, m],
      }));
    });

    socket.on('user:joined', (u) => {
      setState(prev => ({
        ...prev,
        users: prev.users.some(eu => eu.id === u.id) ? prev.users : [...prev.users, u],
      }));
    });
  }

  // ── Auth init — check stored JWT, refresh if expired ────

  useEffect(() => {
    function isTokenExpired(token) {
      if (!token) return true;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now() + 10000; // Expired or expiring in < 10s
      } catch {
        return true;
      }
    }

    async function initAuth() {
      const storedToken = localStorage.getItem('tm_access_token');
      
      if (!storedToken) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      let activeToken = storedToken;

      // Only refresh if the current token is actually expired
      if (isTokenExpired(storedToken)) {
        try {
          const { data } = await api.post('/auth/refresh');
          activeToken = data.accessToken;
          localStorage.setItem('tm_access_token', activeToken);
        } catch (err) {
          console.warn('Silent refresh failed:', err?.message);
          // If refresh fails, we still try to use the stored token once
          // because the interceptor might handle it or it might just work
        }
      }

      connectSocket(activeToken);
      
      try {
        await loadUserData().catch(console.error);
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    }

    initAuth();
  }, []);

  // ── Theme ────────────────────────────────────────────────

  function toggleTheme() {
    const next = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('tm_theme', next);
    setState(prev => ({ ...prev, theme: next }));
  }

  // ── Auth ─────────────────────────────────────────────────

  async function login(accessToken) {
    localStorage.setItem('tm_access_token', accessToken);
    connectSocket(accessToken);
    await loadUserData();
  }

  async function logout() {
    // Clear local state immediately for instant feedback
    localStorage.removeItem('tm_access_token');
    taskListenersAttached.current = false;
    disconnectSocket();
    setState({ ...INITIAL, loading: false, theme: localStorage.getItem('tm_theme') || 'light' });

    // Notify server in background
    api.post('/auth/logout').catch(() => {});
  }

  // ── User profile ─────────────────────────────────────────

  async function updateUserName(name) {
    if (!state.currentUser) return;
    const trimmed = name.trim();
    await api.patch('/users/me', { name: trimmed });
    const updated = { ...state.currentUser, name: trimmed };
    setState(prev => ({
      ...prev,
      currentUser: updated,
      users: prev.users.map(u => u.id === state.currentUser.id ? updated : u),
    }));
  }

  // ── School ───────────────────────────────────────────────

  async function registerSchool(name, address, type) {
    if (!state.currentUser) return null;

    const { data } = await api.post('/schools', {
      name: name.trim(),
      address: address.trim(),
      type,
    });

    const school = { id: data.id, name: data.name, address: data.address, type: data.type };

    setState(prev => ({
      ...prev,
      schools:     [...prev.schools, school],
      memberships: [...prev.memberships, data.membership],
      inviteCodes: { ...prev.inviteCodes, ...data.inviteCodes },
    }));

    return school;
  }

  async function updateSchool(schoolId, edits) {
    await api.patch(`/schools/${schoolId}`, edits);
    setState(prev => ({
      ...prev,
      schools: prev.schools.map(s => s.id === schoolId ? { ...s, ...edits } : s),
    }));
  }

  async function regenerateCode(schoolId, roleKey) {
    const { data } = await api.post(`/schools/${schoolId}/invite-codes/${roleKey}/regenerate`);
    setState(prev => ({
      ...prev,
      inviteCodes: {
        ...prev.inviteCodes,
        [schoolId]: { ...(prev.inviteCodes[schoolId] || {}), [roleKey]: data.code },
      },
    }));
  }

  // ── Membership ───────────────────────────────────────────

  async function joinSchool(code) {
    if (!state.currentUser) return { success: false, error: 'Not logged in' };

    try {
      const { data } = await api.post('/memberships/join', { code: code.trim() });

      setState(prev => ({
        ...prev,
        schools:      data.school ? [...prev.schools, data.school] : prev.schools,
        groups:       [...prev.groups, ...(data.groups || [])],
        memberships:  [
          ...prev.memberships,
          { userId: state.currentUser.id, schoolId: data.schoolId, role: data.role },
        ],
        groupMembers: [...prev.groupMembers, ...(data.groupMemberships || [])],
      }));

      // Silent refresh to pick up tasks and extra profiles
      loadUserData(true).catch(console.error);
      return { success: true, schoolId: data.schoolId };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.message || 'Failed to join school.',
      };
    }
  }

  async function removeMember(schoolId, userId) {
    if (!state.currentUser || userId === state.currentUser.id) return;
    await api.delete(`/memberships/${schoolId}/members/${userId}`);
    const groupIds = state.groups.filter(g => g.schoolId === schoolId).map(g => g.id);
    setState(prev => ({
      ...prev,
      memberships:  prev.memberships.filter(m => !(m.userId === userId && m.schoolId === schoolId)),
      groupMembers: prev.groupMembers.filter(gm => !(gm.userId === userId && groupIds.includes(gm.groupId))),
    }));
  }

  // ── Groups ────────────────────────────────────────────────

  async function addGroup(schoolId, name, parentId = null, userIds = []) {
    const { data } = await api.post('/groups', {
      schoolId,
      name: name.trim(),
      parentId: parentId || undefined,
      userIds: userIds.length ? userIds : undefined,
    });

    setState(prev => ({
      ...prev,
      groups: [
        ...prev.groups,
        { id: data.id, schoolId: data.schoolId, name: data.name, parentId: data.parentId },
      ],
      groupMembers: [...prev.groupMembers, ...(data.groupMembers || [])],
    }));

    return data;
  }

  async function renameGroup(groupId, newName) {
    await api.patch(`/groups/${groupId}`, { name: newName.trim() });
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, name: newName.trim() } : g),
    }));
  }

  async function deleteGroup(groupId) {
    const { data } = await api.delete(`/groups/${groupId}`);
    const toDelete = data.deletedGroupIds || [groupId];

    setState(prev => ({
      ...prev,
      groups:       prev.groups.filter(g => !toDelete.includes(g.id)),
      groupMembers: prev.groupMembers.filter(gm => !toDelete.includes(gm.groupId)),
      tasks:        prev.tasks.filter(t => !toDelete.includes(t.groupId)),
    }));
  }

  // ── Tasks ─────────────────────────────────────────────────

  async function addTask(groupId, taskData) {
    if (!state.currentUser) return;
    
    // If assignedTo is an array, create multiple tasks
    const assignees = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [taskData.assignedTo];
    
    const results = [];
    for (const uid of assignees) {
      const { data } = await api.post('/tasks', {
        groupId,
        title:      taskData.title,
        assignedTo: uid || undefined,
        dueDate:    taskData.dueDate || undefined,
        priority:   taskData.priority || 'medium',
      });
      results.push(data);
    }

    // Real-time socket will also update state; this ensures instant local feedback
    setState(prev => {
      let nextTasks = [...prev.tasks];
      results.forEach(data => {
        if (!nextTasks.some(t => t.id === data.id)) {
          nextTasks.push(data);
        }
      });
      return { ...prev, tasks: nextTasks };
    });
  }

  async function toggleTask(taskId) {
    const { data } = await api.patch(`/tasks/${taskId}/toggle`);
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? data : t),
    }));
  }

  async function editTask(taskId, updates) {
    const { data } = await api.patch(`/tasks/${taskId}`, updates);
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? data : t),
    }));
  }

  async function deleteTask(taskId) {
    await api.delete(`/tasks/${taskId}`);
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
  }

  // ── Queries (synchronous, from in-memory state) ───────────

  function getRoleInSchool(schoolId, userId) {
    const uid = userId || state.currentUser?.id;
    return state.memberships.find(m => m.userId === uid && m.schoolId === schoolId)?.role || null;
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
    const myGroupIds = state.groupMembers
      .filter(gm => gm.userId === state.currentUser.id)
      .map(gm => gm.groupId);
    return state.groups.filter(g => g.schoolId === schoolId && myGroupIds.includes(g.id));
  }

  function getGroupMembers(groupId) {
    const ids = state.groupMembers.filter(gm => gm.groupId === groupId).map(gm => gm.userId);
    return state.users.filter(u => ids.includes(u.id));
  }

  function getSchoolMembers(schoolId) {
    return state.memberships
      .filter(m => m.schoolId === schoolId)
      .map(m => ({ user: state.users.find(u => u.id === m.userId), role: m.role }))
      .filter(m => m.user);
  }

  function getGroupTasks(groupId) {
    return state.tasks.filter(t => t.groupId === groupId);
  }

  function getUserById(id) {
    return state.users.find(u => u.id === id);
  }

  function getMyNotifications() {
    if (!state.currentUser) return [];
    
    // Combine overdue tasks and actual notification records
    const today = new Date(new Date().toDateString());
    const taskNotifs = state.tasks
      .filter(t =>
        t.assignedTo === state.currentUser.id &&
        t.status === 'pending' &&
        t.dueDate &&
        new Date(t.dueDate) < today
      )
      .map(t => ({
        id: `task-${t.id}`,
        title: 'Task Overdue',
        message: t.title,
        type: 'warning',
        createdAt: t.dueDate,
        isTask: true,
      }));

    const dbNotifs = state.notifications.map(n => ({
      ...n,
      isTask: false,
    }));

    return [...taskNotifs, ...dbNotifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async function markNotificationAsRead(id) {
    if (id.startsWith('task-')) return; // Can't mark derived task notifs as read here
    await api.patch(`/memberships/notifications/${id}/read`);
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id), // Remove from list if read
    }));
  }

  // ── Permissions ───────────────────────────────────────────

  function canCreateTasks(schoolId) {
    return ['Owner', 'Admin', 'Manager', 'Teacher'].includes(getRoleInSchool(schoolId));
  }

  function canCreateGroups(schoolId) {
    return ['Owner', 'Admin'].includes(getRoleInSchool(schoolId));
  }

  function canManageMembers(schoolId) {
    return getRoleInSchool(schoolId) === 'Owner';
  }

  return (
    <AppContext.Provider value={{
      ...state,
      // auth
      login, logout,
      // theme
      toggleTheme,
      // user
      updateUserName,
      // school
      registerSchool, updateSchool, regenerateCode,
      // membership
      joinSchool, removeMember,
      // groups
      addGroup, renameGroup, deleteGroup,
      // tasks
      addTask, toggleTask, editTask, deleteTask,
      // queries
      getRoleInSchool, getCurrentUserSchools,
      getGroupsForUser, getGroupMembers, getSchoolMembers,
      getGroupTasks, getUserById, getMyNotifications,
      // notifications
      markNotificationAsRead,
      // permissions
      canCreateTasks, canCreateGroups, canManageMembers,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;

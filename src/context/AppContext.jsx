import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ── Data formatters (DB snake_case → app camelCase) ───────────

function fmtProfile(row) {
  return { id: row.id, email: row.email, name: row.name || '' };
}

function fmtSchool(row) {
  return { id: row.id, name: row.name, address: row.address || '', type: row.type || 'Secondary' };
}

function fmtMembership(row) {
  return { userId: row.user_id, schoolId: row.school_id, role: row.role };
}

function fmtGroup(row) {
  return { id: row.id, schoolId: row.school_id, name: row.name, parentId: row.parent_id || null };
}

function fmtGroupMember(row) {
  return { userId: row.user_id, groupId: row.group_id };
}

function fmtTask(row) {
  return {
    id:         row.id,
    groupId:    row.group_id,
    title:      row.title,
    assignedTo: row.assigned_to,
    dueDate:    row.due_date,
    priority:   row.priority,
    status:     row.status,
    createdBy:  row.created_by,
  };
}

function genCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
  theme:        localStorage.getItem('tm_theme') || 'light',
  loading:      true,
};

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const taskSubRef = useRef(null);

  // ── Load all data for a signed-in user ─────────────────────

  async function loadUserData(authUser) {
    try {
      setState(prev => ({ ...prev, loading: true }));

      // Profile
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const profile = profileRow ? fmtProfile(profileRow) : {
        id: authUser.id, email: authUser.email, name: '',
      };

      // Memberships — null-safe (Supabase returns null not [] when table missing)
      const membershipResult = await supabase
        .from('memberships').select('*').eq('user_id', authUser.id);
      const membershipRows = membershipResult.data || [];

      const schoolIds = membershipRows.map(m => m.school_id);

      if (schoolIds.length === 0) {
        setState(prev => ({
          ...prev, currentUser: profile,
          schools: [], users: [profile], groups: [],
          groupMembers: [], tasks: [], memberships: [],
          inviteCodes: {}, loading: false,
        }));
        return;
      }

      // Parallel load: schools, groups, invite codes
      const [schoolResult, groupResult, inviteResult] = await Promise.all([
        supabase.from('schools').select('*').in('id', schoolIds),
        supabase.from('groups').select('*').in('school_id', schoolIds),
        supabase.from('invite_codes').select('*').in('school_id', schoolIds),
      ]);
      const schoolRows = schoolResult.data || [];
      const groupRows  = groupResult.data  || [];
      const inviteRows = inviteResult.data  || [];

      const groupIds = groupRows.map(g => g.id);

      // Parallel load: group members + tasks
      const [gmResult, taskResult] = await Promise.all([
        groupIds.length
          ? supabase.from('group_members').select('*').in('group_id', groupIds)
          : Promise.resolve({ data: [] }),
        groupIds.length
          ? supabase.from('tasks').select('*').in('group_id', groupIds)
          : Promise.resolve({ data: [] }),
      ]);
      const gmRows   = gmResult.data   || [];
      const taskRows = taskResult.data || [];

      // All user profiles visible to this user
      const userIds = [...new Set([authUser.id, ...membershipRows.map(m => m.user_id), ...gmRows.map(gm => gm.user_id)])];
      const userResult = await supabase.from('profiles').select('*').in('id', userIds);
      const userRows = userResult.data || [];

      // Normalise invite codes: { schoolId: { teacher: code, staff: code, manager: code } }
      const inviteCodes = {};
      inviteRows.forEach(r => {
        if (!inviteCodes[r.school_id]) inviteCodes[r.school_id] = {};
        inviteCodes[r.school_id][r.role_key] = r.code;
      });

      setState(prev => ({
        ...prev,
        currentUser:  profile,
        schools:      schoolRows.map(fmtSchool),
        users:        userRows.map(fmtProfile),
        memberships:  membershipRows.map(fmtMembership),
        groups:       groupRows.map(fmtGroup),
        groupMembers: gmRows.map(fmtGroupMember),
        tasks:        taskRows.map(fmtTask),
        inviteCodes,
        loading:      false,
      }));

      // Subscribe to task changes for real-time notification badge
      subscribeToTasks(groupIds);

    } catch (err) {
      console.error('loadUserData error:', err?.message || err);
      setState(prev => ({ ...prev, loading: false, loadError: err?.message || 'Failed to load data' }));
    }
  }

  // ── Supabase Realtime — tasks ─────────────────────────────

  function subscribeToTasks(groupIds) {
    if (taskSubRef.current) supabase.removeChannel(taskSubRef.current);
    if (!groupIds.length) return;

    const ch = supabase
      .channel('task-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, ({ new: row }) => {
        if (groupIds.includes(row.group_id)) {
          setState(prev => ({ ...prev, tasks: [...prev.tasks, fmtTask(row)] }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, ({ new: row }) => {
        setState(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === row.id ? fmtTask(row) : t) }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, ({ old: row }) => {
        setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== row.id) }));
      })
      .subscribe();

    taskSubRef.current = ch;
  }

  // ── Auth state listener ───────────────────────────────────

  useEffect(() => {
    // Timeout guard: if getSession never resolves, stop the spinner after 8s
    const timeoutId = setTimeout(() => {
      setState(prev => { if (prev.loading) return { ...prev, loading: false }; return prev; });
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    }).catch(() => {
      clearTimeout(timeoutId);
      setState(prev => ({ ...prev, loading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await loadUserData(session.user);
      }
      if (event === 'SIGNED_OUT') {
        if (taskSubRef.current) supabase.removeChannel(taskSubRef.current);
        setState({ ...INITIAL, loading: false, theme: localStorage.getItem('tm_theme') || 'light' });
      }
    });

    return () => {
      subscription.unsubscribe();
      if (taskSubRef.current) supabase.removeChannel(taskSubRef.current);
    };
  }, []);

  // ── Theme ────────────────────────────────────────────────

  function toggleTheme() {
    const next = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('tm_theme', next);
    setState(prev => ({ ...prev, theme: next }));
  }

  // ── Auth ─────────────────────────────────────────────────

  async function logout() {
    await supabase.auth.signOut();
  }

  // ── User profile ─────────────────────────────────────────

  async function updateUserName(name) {
    if (!state.currentUser) return;
    const trimmed = name.trim();
    await supabase.from('profiles').update({ name: trimmed }).eq('id', state.currentUser.id);
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

    // Generate school ID client-side so we can insert membership immediately
    // without needing to SELECT the school back (avoids RLS chicken-and-egg)
    const schoolId = crypto.randomUUID();
    const school = { id: schoolId, name: name.trim(), address: address.trim(), type };

    const { error: sErr } = await supabase.from('schools').insert(school);
    if (sErr) throw sErr;

    const { error: mErr } = await supabase
      .from('memberships')
      .insert({ user_id: state.currentUser.id, school_id: schoolId, role: 'Owner' });
    if (mErr) throw mErr;

    const codes = [
      { school_id: schoolId, role_key: 'teacher', code: genCode('T') },
      { school_id: schoolId, role_key: 'staff',   code: genCode('S') },
      { school_id: schoolId, role_key: 'manager', code: genCode('M') },
    ];
    const { error: cErr } = await supabase.from('invite_codes').insert(codes);
    if (cErr) throw cErr;

    const invObj = {};
    codes.forEach(c => { invObj[c.role_key] = c.code; });

    setState(prev => ({
      ...prev,
      schools:     [...prev.schools, school],
      memberships: [...prev.memberships, { userId: state.currentUser.id, schoolId, role: 'Owner' }],
      inviteCodes: { ...prev.inviteCodes, [schoolId]: invObj },
    }));

    return school;
  }

  async function updateSchool(schoolId, edits) {
    await supabase.from('schools').update(edits).eq('id', schoolId);
    setState(prev => ({
      ...prev,
      schools: prev.schools.map(s => s.id === schoolId ? { ...s, ...edits } : s),
    }));
  }

  async function regenerateCode(schoolId, roleKey) {
    const code = genCode(roleKey === 'teacher' ? 'T' : roleKey === 'staff' ? 'S' : 'M');
    await supabase
      .from('invite_codes')
      .upsert({ school_id: schoolId, role_key: roleKey, code }, { onConflict: 'school_id,role_key' });
    setState(prev => ({
      ...prev,
      inviteCodes: {
        ...prev.inviteCodes,
        [schoolId]: { ...(prev.inviteCodes[schoolId] || {}), [roleKey]: code },
      },
    }));
  }

  // ── Membership ───────────────────────────────────────────

  async function joinSchool(code) {
    if (!state.currentUser) return { success: false, error: 'Not logged in' };

    const { data: invRow, error: lookupErr } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code.trim())
      .maybeSingle();

    if (lookupErr) return { success: false, error: 'Could not verify invite code. Please try again.' };
    if (!invRow)   return { success: false, error: 'Invalid invite code. Please check and try again.' };

    const alreadyMember = state.memberships.some(
      m => m.userId === state.currentUser.id && m.schoolId === invRow.school_id
    );
    if (alreadyMember) return { success: false, error: 'You are already a member of this school.' };

    const roleMap = { teacher: 'Teacher', staff: 'Staff', manager: 'Manager' };
    const role = roleMap[invRow.role_key] || 'Staff';

    const { error: mErr } = await supabase
      .from('memberships')
      .insert({ user_id: state.currentUser.id, school_id: invRow.school_id, role });
    if (mErr) return { success: false, error: mErr.message };

    // Add user to all existing groups in the school
    const schoolGroupIds = state.groups
      .filter(g => g.schoolId === invRow.school_id)
      .map(g => g.id);

    if (schoolGroupIds.length) {
      await supabase.from('group_members').insert(
        schoolGroupIds.map(gid => ({ user_id: state.currentUser.id, group_id: gid }))
      );
    }

    setState(prev => ({
      ...prev,
      memberships: [...prev.memberships, { userId: state.currentUser.id, schoolId: invRow.school_id, role }],
      groupMembers: [
        ...prev.groupMembers,
        ...schoolGroupIds.map(gid => ({ userId: state.currentUser.id, groupId: gid })),
      ],
    }));

    // Reload to get school data
    await loadUserData({ id: state.currentUser.id, email: state.currentUser.email });
    return { success: true, schoolId: invRow.school_id };
  }

  async function removeMember(schoolId, userId) {
    if (!state.currentUser || userId === state.currentUser.id) return;
    await supabase.from('memberships').delete()
      .eq('user_id', userId).eq('school_id', schoolId);
    const groupIds = state.groups.filter(g => g.schoolId === schoolId).map(g => g.id);
    if (groupIds.length) {
      await supabase.from('group_members').delete()
        .eq('user_id', userId).in('group_id', groupIds);
    }
    setState(prev => ({
      ...prev,
      memberships:  prev.memberships.filter(m => !(m.userId === userId && m.schoolId === schoolId)),
      groupMembers: prev.groupMembers.filter(gm => !(gm.userId === userId && groupIds.includes(gm.groupId))),
    }));
  }

  // ── Groups ────────────────────────────────────────────────

  async function addGroup(schoolId, name, parentId = null) {
    // Generate ID client-side to avoid post-INSERT SELECT RLS issues
    const groupId = crypto.randomUUID();
    const grp = { id: groupId, schoolId, name: name.trim(), parentId: parentId || null };

    const { error } = await supabase.from('groups').insert({
      id: groupId, school_id: schoolId, name: name.trim(), parent_id: parentId || null,
    });
    if (error) throw error;

    // Add all school members to the new group
    const schoolMembers = state.memberships.filter(m => m.schoolId === schoolId);
    if (schoolMembers.length) {
      await supabase.from('group_members').insert(
        schoolMembers.map(m => ({ user_id: m.userId, group_id: groupId }))
      );
    }

    setState(prev => ({
      ...prev,
      groups: [...prev.groups, grp],
      groupMembers: [
        ...prev.groupMembers,
        ...schoolMembers.map(m => ({ userId: m.userId, groupId })),
      ],
    }));
    return grp;
  }

  async function renameGroup(groupId, newName) {
    await supabase.from('groups').update({ name: newName.trim() }).eq('id', groupId);
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, name: newName.trim() } : g),
    }));
  }

  async function deleteGroup(groupId) {
    // Collect this group and all descendants
    function descendants(id) {
      const children = state.groups.filter(g => g.parentId === id).map(g => g.id);
      return children.flatMap(cid => [cid, ...descendants(cid)]);
    }
    const toDelete = [groupId, ...descendants(groupId)];

    await supabase.from('groups').delete().in('id', toDelete);
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
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        group_id:    groupId,
        title:       taskData.title,
        assigned_to: taskData.assignedTo || null,
        due_date:    taskData.dueDate || null,
        priority:    taskData.priority || 'medium',
        status:      'pending',
        created_by:  state.currentUser.id,
      })
      .select()
      .single();
    if (error) throw error;
    // Real-time subscription will update state; also update locally for instant feedback
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks.filter(t => t.id !== data.id), fmtTask(data)],
    }));
  }

  async function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t),
    }));
  }

  async function editTask(taskId, updates) {
    const dbUpdates = {};
    if (updates.title)      dbUpdates.title       = updates.title;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo || null;
    if (updates.dueDate !== undefined)    dbUpdates.due_date    = updates.dueDate || null;
    if (updates.priority)   dbUpdates.priority    = updates.priority;

    await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId);
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
    const today = new Date(new Date().toDateString());
    return state.tasks.filter(t =>
      t.assignedTo === state.currentUser.id &&
      t.status === 'pending' &&
      t.dueDate &&
      new Date(t.dueDate) < today
    );
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
      logout,
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
      // permissions
      canCreateTasks, canCreateGroups, canManageMembers,
      // supabase client (for ChatTab real-time and image upload)
      supabase,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export default AppContext;

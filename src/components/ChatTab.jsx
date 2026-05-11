import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import Modal from './Modal';
import './ChatTab.css';

// ── Slash commands ────────────────────────────────────────────
const COMMANDS = [
  { id: 'task',     icon: '✅', label: 'Task',         desc: 'Create a quick task in this group',  color: '#1a5c3a' },
  { id: 'image',    icon: '🖼️', label: 'Image',        desc: 'Share an image',                     color: '#2563eb' },
  { id: 'poll',     icon: '📊', label: 'Poll',         desc: 'Start a vote / quick poll',           color: '#7c3aed' },
  { id: 'announce', icon: '📣', label: 'Announcement', desc: 'Post a highlighted announcement',     color: '#b45309' },
  { id: 'todo',     icon: '📋', label: 'To-Do List',   desc: 'Share a shared checklist',            color: '#0891b2' },
  { id: 'mention',  icon: '👤', label: 'Mention',      desc: 'Tag a member in this group',          color: '#be185d' },
];

// ── Helpers ───────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9); }

function formatTime(ts) {
  const d = new Date(ts);
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Rich bubble renderers ─────────────────────────────────────
function AnnouncementBubble({ msg }) {
  return (
    <div className="msg-announce">
      <span className="msg-announce-label">📣 Announcement</span>
      <p className="msg-announce-text">{msg.content}</p>
      <span className="msg-announce-meta">{msg.senderName} · {formatTime(msg.timestamp)}</span>
    </div>
  );
}

function ImageBubble({ msg, isOwn }) {
  return (
    <div className={`chat-bubble img-bubble${isOwn ? ' own-img' : ''}`}>
      <img src={msg.imageUrl} alt="shared" className="msg-image" />
      {msg.content && <p className="msg-img-caption">{msg.content}</p>}
      <span className="chat-time">{formatTime(msg.timestamp)}</span>
    </div>
  );
}

function TaskBubble({ msg }) {
  return (
    <div className="msg-task-card">
      <div className="msg-task-header">
        <span className="msg-task-icon">✅</span>
        <span className="msg-task-label">Task Created</span>
      </div>
      <p className="msg-task-title">{msg.taskTitle}</p>
      {msg.taskAssignee && (
        <p className="msg-task-meta">Assigned to <strong>{msg.taskAssignee}</strong></p>
      )}
      <span className="msg-task-time">{msg.senderName} · {formatTime(msg.timestamp)}</span>
    </div>
  );
}

function PollBubble({ msg, currentUserId, onVote }) {
  const totalVotes = msg.pollOptions.reduce((s, o) => s + o.votes.length, 0);
  const myVote = msg.pollOptions.find(o => o.votes.includes(currentUserId))?.id;
  return (
    <div className="msg-poll">
      <div className="msg-poll-header"><span>📊</span><span className="msg-poll-title">{msg.content}</span></div>
      <div className="msg-poll-options">
        {msg.pollOptions.map(opt => {
          const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          return (
            <button
              key={opt.id}
              className={`poll-option${opt.id === myVote ? ' voted' : ''}`}
              onClick={() => onVote(msg.id, opt.id)}
            >
              <div className="poll-bar" style={{ width: `${pct}%` }} />
              <span className="poll-opt-text">{opt.text}</span>
              <span className="poll-opt-pct">{opt.votes.length} {opt.votes.length === 1 ? 'vote' : 'votes'}</span>
            </button>
          );
        })}
      </div>
      <p className="msg-poll-footer">{totalVotes} total vote{totalVotes !== 1 ? 's' : ''} · {msg.senderName} · {formatTime(msg.timestamp)}</p>
    </div>
  );
}

function TodoBubble({ msg, onToggle }) {
  const done = msg.todoItems.filter(i => i.done).length;
  return (
    <div className="msg-todo">
      <div className="msg-todo-header">
        <span>📋</span>
        <span className="msg-todo-title">{msg.content || 'To-Do List'}</span>
        <span className="msg-todo-progress">{done}/{msg.todoItems.length}</span>
      </div>
      <ul className="msg-todo-list">
        {msg.todoItems.map(item => (
          <li key={item.id} className={`msg-todo-item${item.done ? ' done' : ''}`}>
            <button className="todo-check" onClick={() => onToggle(msg.id, item.id)}>
              {item.done ? '✓' : ''}
            </button>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
      <p className="msg-poll-footer">{msg.senderName} · {formatTime(msg.timestamp)}</p>
    </div>
  );
}

// ── Main ChatTab ──────────────────────────────────────────────
// In-memory message cache to avoid re-fetching on tab switches
const messageCache = {};

export default function ChatTab({ groupId, schoolId }) {
  const { currentUser, addTask, toggleTask, getGroupTasks, canCreateTasks, getGroupMembers, getUserById } = useApp();
  const members = getGroupMembers(groupId);
  const canAdd  = canCreateTasks(schoolId);

  // ── Message state ──
  const [messages, setMessages]       = useState(() => messageCache[groupId]?.messages || []);
  const [msgsLoading, setMsgsLoading] = useState(!messageCache[groupId]);
  const [hasMore, setHasMore]         = useState(false);
  const [cursor, setCursor]           = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Input state ──
  const [text, setText]               = useState('');
  const textRef     = useRef(null);
  const bottomRef   = useRef(null);
  const imageInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // ── Slash menu ──
  const [slashVisible, setSlashVisible] = useState(false);
  const [slashQuery,   setSlashQuery]   = useState('');
  const [slashIdx,     setSlashIdx]     = useState(0);
  const menuRef = useRef(null);

  // ── Active command ──
  const [cmd,          setCmd]          = useState(null);
  const [announceMode, setAnnounceMode] = useState(false);

  // ── Task panel ──
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle,    setTaskTitle]    = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue,      setTaskDue]      = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  const pendingTasks = getGroupTasks(groupId).filter(t => t.status === 'pending');

  // ── Poll form ──
  const [pollQ,    setPollQ]    = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);

  // ── Todo form ──
  const [todoTitle, setTodoTitle] = useState('');
  const [todoItems, setTodoItems] = useState(['', '']);

  // ── Image ──
  const [imgPreview,   setImgPreview]   = useState(null);
  const [imgCaption,   setImgCaption]   = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError,     setImgError]     = useState('');
  const pendingPublicIdRef = useRef(null); // Cloudinary public_id for cleanup on cancel

  // ── Load messages + subscribe to real-time ────────────────

  const loadMessages = useCallback(async () => {
    // Use cache instantly, then refresh in background
    if (messageCache[groupId]) {
      setMessages(messageCache[groupId].messages);
      setHasMore(messageCache[groupId].hasMore);
      setCursor(messageCache[groupId].cursor);
      setMsgsLoading(false);
    } else {
      setMsgsLoading(true);
    }

    try {
      const { data } = await api.get(`/messages?groupId=${groupId}&limit=50`);
      const msgs = data.messages || [];
      setMessages(msgs);
      setHasMore(data.hasMore || false);
      setCursor(data.cursor || null);
      // Update cache
      messageCache[groupId] = { messages: msgs, hasMore: data.hasMore, cursor: data.cursor };
    } catch (err) {
      console.error('Failed to load messages:', err?.message);
    } finally {
      setMsgsLoading(false);
    }
  }, [groupId]);

  const loadOlderMessages = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/messages?groupId=${groupId}&limit=50&before=${cursor}`);
      const older = data.messages || [];
      setMessages(prev => {
        const merged = [...older, ...prev];
        // Deduplicate by id
        const seen = new Set();
        const unique = merged.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
        messageCache[groupId] = { messages: unique, hasMore: data.hasMore, cursor: data.cursor };
        return unique;
      });
      setHasMore(data.hasMore || false);
      setCursor(data.cursor || null);
    } catch (err) {
      console.error('Failed to load older messages:', err?.message);
    } finally {
      setLoadingMore(false);
    }
  }, [groupId, cursor, loadingMore]);

  useEffect(() => {
    loadMessages();

    const socket = getSocket();
    if (socket) {
      socket.emit('join:chat', groupId);

      const onCreated = (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          messageCache[groupId] = { ...messageCache[groupId], messages: next };
          return next;
        });
      };
      const onUpdated = (msg) => {
        setMessages(prev => {
          const next = prev.map(m => m.id === msg.id ? msg : m);
          messageCache[groupId] = { ...messageCache[groupId], messages: next };
          return next;
        });
      };
      const onDeleted = ({ id }) => {
        setMessages(prev => {
          const next = prev.filter(m => m.id !== id);
          messageCache[groupId] = { ...messageCache[groupId], messages: next };
          return next;
        });
      };

      socket.on('message:created', onCreated);
      socket.on('message:updated', onUpdated);
      socket.on('message:deleted', onDeleted);

      return () => {
        socket.emit('leave:chat', groupId);
        socket.off('message:created', onCreated);
        socket.off('message:updated', onUpdated);
        socket.off('message:deleted', onDeleted);
      };
    }
  }, [groupId, loadMessages]);

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);


  // ── Close slash menu on outside click ──
  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setSlashVisible(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Send a message ────────────────────────────────────────

  async function sendMessage(content, extra = {}) {
    if (!currentUser) return;
    const { type = 'text', ...metadata } = extra;
    await api.post('/messages', { groupId, content, type, metadata });
    // Real-time socket will add it to the list
  }

  // ── Poll vote ─────────────────────────────────────────────

  async function handleVoteOnPoll(msgId, optionId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !currentUser) return;

    // Optimistic update
    const uid = currentUser.id;
    const newOptions = msg.pollOptions.map(opt => {
      const votes = opt.votes.filter(v => v !== uid);
      if (opt.id === optionId) votes.push(uid);
      return { ...opt, votes };
    });
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pollOptions: newOptions } : m));

    await api.patch(`/messages/${msgId}/vote`, { optionId });
  }

  // ── Todo toggle ───────────────────────────────────────────

  async function handleToggleTodoItem(msgId, itemId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    // Optimistic update
    const newItems = msg.todoItems.map(it => it.id === itemId ? { ...it, done: !it.done } : it);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, todoItems: newItems } : m));

    await api.patch(`/messages/${msgId}/toggle-todo`, { itemId });
  }

  // ── Input handler ─────────────────────────────────────────

  const filteredCmds = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(slashQuery) ||
    c.id.startsWith(slashQuery)
  );

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);
    const lastLine = val.split('\n').pop();
    if (lastLine.startsWith('/') && !lastLine.includes(' ')) {
      setSlashQuery(lastLine.slice(1).toLowerCase());
      setSlashVisible(true);
      setSlashIdx(0);
    } else {
      setSlashVisible(false);
    }
  }

  function handleKeyDown(e) {
    if (slashVisible && filteredCmds.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => (i + 1) % filteredCmds.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(i => (i - 1 + filteredCmds.length) % filteredCmds.length); return; }
      if (e.key === 'Enter')     { e.preventDefault(); selectCommand(filteredCmds[slashIdx]); return; }
      if (e.key === 'Escape')    { setSlashVisible(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !slashVisible) {
      e.preventDefault();
      handleSend();
    }
  }

  function selectCommand(command) {
    setSlashVisible(false);
    const lines = text.split('\n');
    lines[lines.length - 1] = '';
    setText(lines.join('\n').trimEnd());
    if (command.id === 'task') { setCmd('tasks'); setShowTaskForm(false); return; }
    setCmd(command.id);
    if (command.id === 'image') imageInputRef.current?.click();
    if (command.id === 'announce') { setAnnounceMode(true); setCmd(null); textRef.current?.focus(); }
  }

  function cancelCmd() {
    setCmd(null);
    setAnnounceMode(false);
    setShowTaskForm(false);
    setTaskTitle(''); setTaskAssignee(''); setTaskDue(''); setTaskPriority('medium');
    setPollQ(''); setPollOpts(['', '']);
    setTodoTitle(''); setTodoItems(['', '']);
    setImgPreview(null); setImgCaption(''); setImgError('');
    if (pendingPublicIdRef.current) {
      // Clean up orphaned Cloudinary upload
      api.delete(`/upload/chat-image/${encodeURIComponent(pendingPublicIdRef.current)}`)
        .catch(() => {});
      pendingPublicIdRef.current = null;
    }
    textRef.current?.focus();
  }

  // ── Send plain/announce ───────────────────────────────────

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    setText('');
    setAnnounceMode(false);
    await sendMessage(content, announceMode ? { type: 'announcement' } : {});
  }

  // ── Task submit ───────────────────────────────────────────

  async function submitTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const assigneeName = members.find(m => m.id === taskAssignee)?.name || '';
    await addTask(groupId, { title: taskTitle.trim(), assignedTo: taskAssignee, dueDate: taskDue, priority: taskPriority });
    await sendMessage(taskTitle.trim(), { type: 'task', taskTitle: taskTitle.trim(), taskAssignee: assigneeName });
    // Go back to task list within the panel
    setTaskTitle(''); setTaskAssignee(''); setTaskDue(''); setTaskPriority('medium');
    setShowTaskForm(false);
  }

  // ── Image upload ──────────────────────────────────────────

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) { cancelCmd(); return; }
    if (file.size > 500 * 1024) {
      setImgError('Image must be under 500 KB. Please choose a smaller file.');
      e.target.value = '';
      cancelCmd();
      return;
    }
    setImgError('');
    setImgUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/upload/chat-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      pendingPublicIdRef.current = data.publicId;
      setImgPreview(data.url);
      setCmd('image-preview');
    } catch {
      setImgError('Upload failed. Please try again.');
    } finally {
      setImgUploading(false);
      e.target.value = '';
    }
  }

  async function submitImage() {
    if (!imgPreview) return;
    await sendMessage(imgCaption.trim(), { type: 'image', imageUrl: imgPreview });
    pendingPublicIdRef.current = null;
    cancelCmd();
  }

  // ── Poll submit ───────────────────────────────────────────

  async function submitPoll(e) {
    e.preventDefault();
    const q    = pollQ.trim();
    const opts = pollOpts.filter(o => o.trim()).map(o => ({ id: genId(), text: o.trim(), votes: [] }));
    if (!q || opts.length < 2) return;
    await sendMessage(q, { type: 'poll', pollOptions: opts });
    cancelCmd();
  }

  // ── Todo submit ───────────────────────────────────────────

  async function submitTodo(e) {
    e.preventDefault();
    const items = todoItems.filter(i => i.trim()).map(i => ({ id: genId(), text: i.trim(), done: false }));
    if (!items.length) return;
    await sendMessage(todoTitle.trim() || 'To-Do List', { type: 'todo', todoItems: items });
    cancelCmd();
  }

  // ── Mention insert ────────────────────────────────────────

  function insertMention(member) {
    setText(t => t + `@${member.name || member.email} `);
    setCmd(null);
    setTimeout(() => textRef.current?.focus(), 50);
  }

  // ── Render message ────────────────────────────────────────

  function renderMentions(content) {
    return content.split(/(@\w[\w\s]*)/g).map((part, i) =>
      part.startsWith('@') ? <span key={i} className="mention-chip">{part}</span> : part
    );
  }

  function renderMessage(msg) {
    const isOwn = msg.senderId === currentUser?.id;
    if (msg.type === 'announcement') return <AnnouncementBubble key={msg.id} msg={msg} />;
    if (msg.type === 'task') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''}`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <TaskBubble msg={msg} />
      </div>
    );
    if (msg.type === 'poll') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''} wide-msg`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <PollBubble msg={msg} currentUserId={currentUser?.id} onVote={handleVoteOnPoll} />
      </div>
    );
    if (msg.type === 'todo') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''} wide-msg`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <TodoBubble msg={msg} onToggle={handleToggleTodoItem} />
      </div>
    );
    if (msg.type === 'image') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''}`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <div className="chat-bubble-wrap">
          {!isOwn && <span className="chat-sender">{msg.senderName}</span>}
          <ImageBubble msg={msg} isOwn={isOwn} />
        </div>
      </div>
    );
    // default text
    return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''}`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <div className="chat-bubble-wrap">
          {!isOwn && <span className="chat-sender">{msg.senderName}</span>}
          <div className="chat-bubble">
            <span className="chat-text">{renderMentions(msg.content)}</span>
            <span className="chat-time">{formatTime(msg.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="chat-tab">
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleImageFile} />

      <div className="chat-messages" ref={scrollContainerRef}>
        {msgsLoading && (
          <div className="chat-skeleton">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`chat-skel-row${i % 3 === 0 ? ' own' : ''}`}>
                <div className="chat-skel-avatar" />
                <div className="chat-skel-bubble">
                  <div className="chat-skel-line" style={{ width: `${50 + Math.random() * 40}%` }} />
                  <div className="chat-skel-line short" style={{ width: `${30 + Math.random() * 25}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!msgsLoading && hasMore && (
          <div className="chat-load-more">
            <button onClick={loadOlderMessages} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : '↑ Load older messages'}
            </button>
          </div>
        )}
        {!msgsLoading && messages.length === 0 && (
          <div className="chat-empty">No messages yet. Type <code>/</code> to see what you can share.</div>
        )}
        {messages.map(renderMessage)}
        <div ref={bottomRef} />
      </div>

      {/* ── Tasks popup (slash /task) ── */}
      {cmd === 'tasks' && (
        <Modal title={showTaskForm ? '✅ Add Task' : '✅ Pending Tasks'} onClose={cancelCmd} width={440}>
          {showTaskForm ? (
            <form onSubmit={submitTask} className="cmd-form">
              <input className="cmd-input" placeholder="Task title *" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} autoFocus maxLength={200} />
              <div className="cmd-row">
                <select className="cmd-select" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                  <option value="">Assign to…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                </select>
                <input type="date" className="cmd-select" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
                <select className="cmd-select" value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="cmd-actions">
                <button type="button" className="cmd-cancel" onClick={() => setShowTaskForm(false)}>← Back</button>
                <button type="submit" className="cmd-submit" disabled={!taskTitle.trim()}>Create Task</button>
              </div>
            </form>
          ) : (
            <>
              <div className="cmd-tasks-list">
                {pendingTasks.length === 0 && (
                  <div className="cmd-tasks-empty">No pending tasks.</div>
                )}
                {pendingTasks.map(task => (
                  <div key={task.id} className="cmd-task-item">
                    <button
                      className="cmd-task-toggle"
                      onClick={() => toggleTask(task.id)}
                      title="Mark as complete"
                    />
                    <span className="cmd-task-title">{task.title}</span>
                    <span className={`cmd-task-prio prio-${task.priority}`}>{task.priority}</span>
                  </div>
                ))}
              </div>
              {canAdd && (
                <div className="cmd-tasks-footer">
                  <button className="cmd-add-task-btn" onClick={() => setShowTaskForm(true)}>+ Add Task</button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {imgUploading && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>🖼️ Uploading image…</span></div>
          <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Please wait…</div>
        </div>
      )}

      {cmd === 'image-preview' && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>🖼️ Share Image</span><button onClick={cancelCmd}>✕</button></div>
          <div className="img-preview-wrap">
            <img src={imgPreview} alt="preview" className="img-preview" />
          </div>
          <div className="cmd-form">
            <input className="cmd-input" placeholder="Add a caption (optional)" value={imgCaption} onChange={e => setImgCaption(e.target.value)} autoFocus />
            <div className="cmd-actions">
              <button type="button" className="cmd-cancel" onClick={cancelCmd}>Cancel</button>
              <button type="button" className="cmd-submit" onClick={submitImage}>Send Image</button>
            </div>
          </div>
        </div>
      )}

      {cmd === 'poll' && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>📊 Create Poll</span><button onClick={cancelCmd}>✕</button></div>
          <form onSubmit={submitPoll} className="cmd-form">
            <input className="cmd-input" placeholder="Ask a question *" value={pollQ} onChange={e => setPollQ(e.target.value)} autoFocus maxLength={200} />
            {pollOpts.map((opt, i) => (
              <div key={i} className="cmd-opt-row">
                <input className="cmd-input" placeholder={`Option ${i + 1}${i < 2 ? ' *' : ''}`} value={opt}
                  onChange={e => { const n=[...pollOpts]; n[i]=e.target.value; setPollOpts(n); }} maxLength={100} />
                {i > 1 && <button type="button" className="cmd-opt-del" onClick={() => setPollOpts(o => o.filter((_,j)=>j!==i))}>✕</button>}
              </div>
            ))}
            {pollOpts.length < 6 && (
              <button type="button" className="cmd-add-opt" onClick={() => setPollOpts(o => [...o, ''])}>+ Add option</button>
            )}
            <div className="cmd-actions">
              <button type="button" className="cmd-cancel" onClick={cancelCmd}>Cancel</button>
              <button type="submit" className="cmd-submit" disabled={!pollQ.trim() || pollOpts.filter(o=>o.trim()).length < 2}>Post Poll</button>
            </div>
          </form>
        </div>
      )}

      {cmd === 'todo' && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>📋 To-Do List</span><button onClick={cancelCmd}>✕</button></div>
          <form onSubmit={submitTodo} className="cmd-form">
            <input className="cmd-input" placeholder="List title (optional)" value={todoTitle} onChange={e => setTodoTitle(e.target.value)} autoFocus maxLength={100} />
            {todoItems.map((item, i) => (
              <div key={i} className="cmd-opt-row">
                <span className="todo-bullet">□</span>
                <input className="cmd-input" placeholder={`Item ${i + 1}${i < 2 ? ' *' : ''}`} value={item}
                  onChange={e => { const n=[...todoItems]; n[i]=e.target.value; setTodoItems(n); }} maxLength={200} />
                {i > 1 && <button type="button" className="cmd-opt-del" onClick={() => setTodoItems(o => o.filter((_,j)=>j!==i))}>✕</button>}
              </div>
            ))}
            {todoItems.length < 10 && (
              <button type="button" className="cmd-add-opt" onClick={() => setTodoItems(o => [...o, ''])}>+ Add item</button>
            )}
            <div className="cmd-actions">
              <button type="button" className="cmd-cancel" onClick={cancelCmd}>Cancel</button>
              <button type="submit" className="cmd-submit" disabled={todoItems.filter(i=>i.trim()).length < 1}>Share List</button>
            </div>
          </form>
        </div>
      )}

      {cmd === 'mention' && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>👤 Mention a member</span><button onClick={cancelCmd}>✕</button></div>
          <div className="mention-list">
            {members.map(m => (
              <button key={m.id} className="mention-item" onClick={() => insertMention(m)}>
                <span className="mention-av">{getInitials(m.name || m.email)}</span>
                <span>{m.name || m.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="chat-input-area" ref={menuRef}>
        {slashVisible && filteredCmds.length > 0 && (
          <div className="slash-menu">
            <div className="slash-menu-header">Commands</div>
            {filteredCmds.map((c, i) => (
              <button
                key={c.id}
                className={`slash-item${i === slashIdx ? ' active' : ''}`}
                onMouseDown={e => { e.preventDefault(); selectCommand(c); }}
                onMouseEnter={() => setSlashIdx(i)}
              >
                <span className="slash-icon" style={{ background: c.color + '18', color: c.color }}>{c.icon}</span>
                <div className="slash-info">
                  <span className="slash-label">{c.label}</span>
                  <span className="slash-desc">{c.desc}</span>
                </div>
                <kbd className="slash-kbd">/{c.id}</kbd>
              </button>
            ))}
          </div>
        )}

        {imgError && (
          <div className="chat-img-error">
            ⚠️ {imgError}
            <button onClick={() => setImgError('')}>✕</button>
          </div>
        )}

        {announceMode && (
          <div className="announce-mode-bar">
            <span>📣 Announcement mode</span>
            <button onClick={() => setAnnounceMode(false)}>✕</button>
          </div>
        )}

        <form className={`chat-input-bar${announceMode ? ' announce-active' : ''}`} onSubmit={e => { e.preventDefault(); handleSend(); }}>
          <textarea
            ref={textRef}
            className="chat-input"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={announceMode ? 'Type your announcement…' : 'Message… Type / for commands'}
            rows={1}
            maxLength={2000}
          />
          <button type="submit" className="chat-send-btn" disabled={!text.trim()}>
            {announceMode ? '📣' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

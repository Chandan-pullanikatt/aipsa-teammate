import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
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

// Convert DB row → app message shape (metadata is spread flat)
function fmtMsg(row) {
  return {
    id:         row.id,
    groupId:    row.group_id,
    senderId:   row.sender_id,
    senderName: row.sender_name,
    content:    row.content,
    type:       row.type,
    timestamp:  row.created_at,
    ...(row.metadata || {}),
  };
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
export default function ChatTab({ groupId, schoolId }) {
  const { currentUser, addTask, canCreateTasks, getGroupMembers, getUserById, supabase } = useApp();
  const members = getGroupMembers(groupId);
  const canAdd  = canCreateTasks(schoolId);

  // ── Message state (owned by ChatTab, backed by Supabase) ──
  const [messages, setMessages]   = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(true);

  // ── Input state ──
  const [text, setText]             = useState('');
  const textRef   = useRef(null);
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);

  // ── Slash menu ──
  const [slashVisible, setSlashVisible] = useState(false);
  const [slashQuery,   setSlashQuery]   = useState('');
  const [slashIdx,     setSlashIdx]     = useState(0);
  const menuRef = useRef(null);

  // ── Active command ──
  const [cmd,          setCmd]          = useState(null);
  const [announceMode, setAnnounceMode] = useState(false);

  // ── Task form ──
  const [taskTitle,    setTaskTitle]    = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue,      setTaskDue]      = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  // ── Poll form ──
  const [pollQ,    setPollQ]    = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);

  // ── Todo form ──
  const [todoTitle, setTodoTitle] = useState('');
  const [todoItems, setTodoItems] = useState(['', '']);

  // ── Image ──
  const [imgPreview, setImgPreview] = useState(null);
  const [imgCaption, setImgCaption] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError,   setImgError]   = useState('');
  const pendingUploadRef = useRef(null); // stores Supabase storage path while previewing

  // ── Load messages + subscribe to realtime ────────────────

  const loadMessages = useCallback(async () => {
    setMsgsLoading(true);
    const { data = [] } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    setMessages(data.map(fmtMsg));
    setMsgsLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadMessages();

    const ch = supabase
      .channel(`chat-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        ({ new: row }) => setMessages(prev => {
          if (prev.some(m => m.id === row.id)) return prev;
          return [...prev, fmtMsg(row)];
        })
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        ({ new: row }) => setMessages(prev => prev.map(m => m.id === row.id ? fmtMsg(row) : m))
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        ({ old: row }) => setMessages(prev => prev.filter(m => m.id !== row.id))
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
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

  // ── Send a message to Supabase ────────────────────────────

  async function sendMessage(content, extra = {}) {
    if (!currentUser) return;
    const { type = 'text', ...metadata } = extra;
    await supabase.from('messages').insert({
      group_id:    groupId,
      sender_id:   currentUser.id,
      sender_name: currentUser.name || currentUser.email,
      content,
      type,
      metadata,
    });
    // Real-time subscription will add it to the list
  }

  // ── Poll vote ─────────────────────────────────────────────

  async function handleVoteOnPoll(msgId, optionId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !currentUser) return;
    const uid = currentUser.id;
    const newOptions = msg.pollOptions.map(opt => {
      const votes = opt.votes.filter(v => v !== uid);
      if (opt.id === optionId) votes.push(uid);
      return { ...opt, votes };
    });
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pollOptions: newOptions } : m));
    await supabase.from('messages')
      .update({ metadata: { pollOptions: newOptions } })
      .eq('id', msgId);
  }

  // ── Todo toggle ───────────────────────────────────────────

  async function handleToggleTodoItem(msgId, itemId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newItems = msg.todoItems.map(it => it.id === itemId ? { ...it, done: !it.done } : it);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, todoItems: newItems } : m));
    await supabase.from('messages')
      .update({ metadata: { todoItems: newItems } })
      .eq('id', msgId);
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
    setCmd(command.id);
    if (command.id === 'image') imageInputRef.current?.click();
    if (command.id === 'announce') { setAnnounceMode(true); setCmd(null); textRef.current?.focus(); }
  }

  function cancelCmd() {
    setCmd(null);
    setAnnounceMode(false);
    setTaskTitle(''); setTaskAssignee(''); setTaskDue(''); setTaskPriority('medium');
    setPollQ(''); setPollOpts(['', '']);
    setTodoTitle(''); setTodoItems(['', '']);
    setImgPreview(null); setImgCaption(''); setImgError('');
    if (pendingUploadRef.current) {
      // Clean up orphaned upload
      supabase.storage.from('chat-images').remove([pendingUploadRef.current]);
      pendingUploadRef.current = null;
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
    cancelCmd();
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

    const ext  = file.name.split('.').pop().toLowerCase();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('chat-images')
      .upload(path, file, { contentType: file.type, upsert: false });

    setImgUploading(false);
    e.target.value = '';

    if (uploadErr) {
      setImgError('Upload failed. Please try again.');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(uploadData.path);

    pendingUploadRef.current = uploadData.path;
    setImgPreview(publicUrl);
    setCmd('image-preview');
  }

  async function submitImage() {
    if (!imgPreview) return;
    await sendMessage(imgCaption.trim(), { type: 'image', imageUrl: imgPreview });
    pendingUploadRef.current = null;
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

  function renderMentions(content) {
    return content.split(/(@\w[\w\s]*)/g).map((part, i) =>
      part.startsWith('@') ? <span key={i} className="mention-chip">{part}</span> : part
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="chat-tab">
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleImageFile} />

      <div className="chat-messages">
        {msgsLoading && <div className="chat-empty">Loading messages…</div>}
        {!msgsLoading && messages.length === 0 && (
          <div className="chat-empty">No messages yet. Type <code>/</code> to see what you can share.</div>
        )}
        {messages.map(renderMessage)}
        <div ref={bottomRef} />
      </div>

      {/* ── Command panels ── */}
      {cmd === 'task' && canAdd && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>✅ Quick Task</span><button onClick={cancelCmd}>✕</button></div>
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
              <button type="button" className="cmd-cancel" onClick={cancelCmd}>Cancel</button>
              <button type="submit" className="cmd-submit" disabled={!taskTitle.trim()}>Create Task</button>
            </div>
          </form>
        </div>
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

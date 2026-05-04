import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './ChatTab.css';

// ─── Slash commands registry ──────────────────────────────────────────────────
const COMMANDS = [
  { id: 'task',     icon: '✅', label: 'Task',         desc: 'Create a quick task in this group',  color: '#1a5c3a' },
  { id: 'image',    icon: '🖼️', label: 'Image',        desc: 'Share an image',                     color: '#2563eb' },
  { id: 'poll',     icon: '📊', label: 'Poll',         desc: 'Start a vote / quick poll',           color: '#7c3aed' },
  { id: 'announce', icon: '📣', label: 'Announcement', desc: 'Post a highlighted announcement',     color: '#b45309' },
  { id: 'todo',     icon: '📋', label: 'To-Do List',   desc: 'Share a shared checklist',            color: '#0891b2' },
  { id: 'mention',  icon: '👤', label: 'Mention',      desc: 'Tag a member in this group',          color: '#be185d' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9); }

function formatTime(ts) {
  const d = new Date(ts);
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// ─── Rich message bubble renderers ────────────────────────────────────────────
function AnnouncementBubble({ msg, isOwn }) {
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
      <div className="msg-poll-header">
        <span>📊</span>
        <span className="msg-poll-title">{msg.content}</span>
      </div>
      <div className="msg-poll-options">
        {msg.pollOptions.map(opt => {
          const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const voted = opt.id === myVote;
          return (
            <button
              key={opt.id}
              className={`poll-option${voted ? ' voted' : ''}`}
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

function TodoBubble({ msg, currentUserId, onToggle }) {
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

// ─── Main ChatTab ──────────────────────────────────────────────────────────────
export default function ChatTab({ groupId, schoolId }) {
  const { getGroupMessages, getGroupMembers, addMessage, addTask, voteOnPoll, toggleTodoItem, currentUser, getUserById } = useApp();
  const members = getGroupMembers(groupId);
  const messages = getGroupMessages(groupId);

  // main text input
  const [text, setText] = useState('');
  const textRef = useRef(null);
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);

  // slash menu
  const [slashVisible, setSlashVisible] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIdx, setSlashIdx] = useState(0);
  const menuRef = useRef(null);

  // active command
  const [cmd, setCmd] = useState(null); // 'task' | 'image' | 'poll' | 'announce' | 'todo' | 'mention'
  const [announceMode, setAnnounceMode] = useState(false);

  // task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  // poll form
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);

  // todo form
  const [todoTitle, setTodoTitle] = useState('');
  const [todoItems, setTodoItems] = useState(['', '']);

  // image
  const [imgPreview, setImgPreview] = useState(null);
  const [imgCaption, setImgCaption] = useState('');

  // ── auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── close slash menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setSlashVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCmds = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(slashQuery) ||
    c.desc.toLowerCase().includes(slashQuery) ||
    c.id.startsWith(slashQuery)
  );

  // ── input change handler
  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);

    // detect slash at start OR after a newline
    const lastLine = val.split('\n').pop();
    if (lastLine.startsWith('/') && !lastLine.includes(' ')) {
      setSlashQuery(lastLine.slice(1).toLowerCase());
      setSlashVisible(true);
      setSlashIdx(0);
    } else {
      setSlashVisible(false);
    }
  }

  // ── keyboard navigation for slash menu
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

  // ── select a slash command
  function selectCommand(command) {
    setSlashVisible(false);
    // remove the slash trigger from text
    const lines = text.split('\n');
    lines[lines.length - 1] = '';
    setText(lines.join('\n').trimEnd());
    setCmd(command.id);
    if (command.id === 'image') imageInputRef.current?.click();
    if (command.id === 'announce') { setAnnounceMode(true); setCmd(null); textRef.current?.focus(); }
    if (command.id === 'mention') {
      // handled separately — immediately show mention picker
    }
  }

  function cancelCmd() {
    setCmd(null);
    setAnnounceMode(false);
    setTaskTitle(''); setTaskAssignee(''); setTaskDue(''); setTaskPriority('medium');
    setPollQ(''); setPollOpts(['', '']);
    setTodoTitle(''); setTodoItems(['', '']);
    setImgPreview(null); setImgCaption('');
    textRef.current?.focus();
  }

  // ── send plain/announce message
  function handleSend() {
    const content = text.trim();
    if (!content) return;
    addMessage(groupId, content, announceMode ? { type: 'announcement' } : {});
    setText('');
    setAnnounceMode(false);
  }

  // ── task submit
  function submitTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const assigneeName = members.find(m => m.id === taskAssignee)?.name || '';
    addTask(groupId, { title: taskTitle.trim(), assignedTo: taskAssignee, dueDate: taskDue, priority: taskPriority });
    addMessage(groupId, taskTitle.trim(), {
      type: 'task',
      taskTitle: taskTitle.trim(),
      taskAssignee: assigneeName,
    });
    cancelCmd();
  }

  // ── image upload
  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) { cancelCmd(); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setImgPreview(ev.target.result);
      setCmd('image-preview');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function submitImage() {
    if (!imgPreview) return;
    addMessage(groupId, imgCaption.trim(), { type: 'image', imageUrl: imgPreview });
    cancelCmd();
  }

  // ── poll submit
  function submitPoll(e) {
    e.preventDefault();
    const q = pollQ.trim();
    const opts = pollOpts.filter(o => o.trim()).map(o => ({ id: genId(), text: o.trim(), votes: [] }));
    if (!q || opts.length < 2) return;
    addMessage(groupId, q, { type: 'poll', pollOptions: opts });
    cancelCmd();
  }

  // ── todo submit
  function submitTodo(e) {
    e.preventDefault();
    const items = todoItems.filter(i => i.trim()).map(i => ({ id: genId(), text: i.trim(), done: false }));
    if (items.length === 0) return;
    addMessage(groupId, todoTitle.trim() || 'To-Do List', { type: 'todo', todoItems: items });
    cancelCmd();
  }

  // ── mention: insert @Name into text
  function insertMention(member) {
    const mention = `@${member.name} `;
    setText(t => t + mention);
    setCmd(null);
    setTimeout(() => textRef.current?.focus(), 50);
  }

  // ── render a single message
  function renderMessage(msg) {
    const isOwn = msg.senderId === currentUser?.id;
    if (msg.type === 'announcement') return <AnnouncementBubble key={msg.id} msg={msg} isOwn={isOwn} />;
    if (msg.type === 'task') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''}`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <TaskBubble msg={msg} />
      </div>
    );
    if (msg.type === 'poll') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''} wide-msg`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <PollBubble msg={msg} currentUserId={currentUser?.id} onVote={voteOnPoll} />
      </div>
    );
    if (msg.type === 'todo') return (
      <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''} wide-msg`}>
        {!isOwn && <div className="chat-avatar">{getInitials(msg.senderName)}</div>}
        <TodoBubble msg={msg} currentUserId={currentUser?.id} onToggle={toggleTodoItem} />
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
    const parts = content.split(/(@\w[\w\s]*)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? <span key={i} className="mention-chip">{part}</span> : part
    );
  }

  return (
    <div className="chat-tab">
      {/* hidden file input */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && <div className="chat-empty">No messages yet. Type <code>/</code> to see what you can share.</div>}
        {messages.map(renderMessage)}
        <div ref={bottomRef} />
      </div>

      {/* Command forms */}
      {cmd === 'task' && (
        <div className="cmd-panel">
          <div className="cmd-panel-header"><span>✅ Quick Task</span><button onClick={cancelCmd}>✕</button></div>
          <form onSubmit={submitTask} className="cmd-form">
            <input className="cmd-input" placeholder="Task title *" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} autoFocus />
            <div className="cmd-row">
              <select className="cmd-select" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                <option value="">Assign to…</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
            <input className="cmd-input" placeholder="Ask a question *" value={pollQ} onChange={e => setPollQ(e.target.value)} autoFocus />
            {pollOpts.map((opt, i) => (
              <div key={i} className="cmd-opt-row">
                <input
                  className="cmd-input"
                  placeholder={`Option ${i + 1}${i < 2 ? ' *' : ''}`}
                  value={opt}
                  onChange={e => { const n=[...pollOpts]; n[i]=e.target.value; setPollOpts(n); }}
                />
                {i > 1 && (
                  <button type="button" className="cmd-opt-del" onClick={() => setPollOpts(o => o.filter((_,j) => j!==i))}>✕</button>
                )}
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
            <input className="cmd-input" placeholder="List title (optional)" value={todoTitle} onChange={e => setTodoTitle(e.target.value)} autoFocus />
            {todoItems.map((item, i) => (
              <div key={i} className="cmd-opt-row">
                <span className="todo-bullet">□</span>
                <input
                  className="cmd-input"
                  placeholder={`Item ${i + 1}${i < 2 ? ' *' : ''}`}
                  value={item}
                  onChange={e => { const n=[...todoItems]; n[i]=e.target.value; setTodoItems(n); }}
                />
                {i > 1 && (
                  <button type="button" className="cmd-opt-del" onClick={() => setTodoItems(o => o.filter((_,j) => j!==i))}>✕</button>
                )}
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
                <span className="mention-av">{getInitials(m.name)}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-area" ref={menuRef}>
        {/* Slash command menu */}
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
          />
          <button type="submit" className="chat-send-btn" disabled={!text.trim()}>
            {announceMode ? '📣' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

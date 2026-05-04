import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './ChatTab.css';

function formatTime(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatTab({ groupId }) {
  const { getGroupMessages, addMessage, currentUser } = useApp();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const messages = getGroupMessages(groupId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    addMessage(groupId, content);
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  return (
    <div className="chat-tab">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Start the conversation!</div>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === currentUser?.id;
          return (
            <div key={msg.id} className={`chat-msg${isOwn ? ' own' : ''}`}>
              {!isOwn && (
                <div className="chat-avatar">{getInitials(msg.senderName)}</div>
              )}
              <div className="chat-bubble-wrap">
                {!isOwn && <span className="chat-sender">{msg.senderName}</span>}
                <div className="chat-bubble">
                  <span className="chat-text">{msg.content}</span>
                  <span className="chat-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <textarea
          className="chat-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
        />
        <button type="submit" className="chat-send-btn" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

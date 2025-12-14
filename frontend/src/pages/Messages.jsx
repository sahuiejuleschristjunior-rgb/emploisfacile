// frontend/src/pages/Messages.jsx
import React, { useState } from "react";
import "../styles/messages.css";

export default function Messages() {
  // =====================================================
  // STATE
  // =====================================================
  const [activeChat, setActiveChat] = useState(null);

  // =====================================================
  // MOCK AMIS (temporaire)
  // sera remplacé par l'API plus tard
  // =====================================================
  const friends = [
    {
      id: 1,
      name: "Jean Dupont",
      avatar: "https://i.pravatar.cc/150?img=3",
      lastMessage: "Salut, ça va ?",
    },
    {
      id: 2,
      name: "Marie Kouassi",
      avatar: "https://i.pravatar.cc/150?img=5",
      lastMessage: "On se parle plus tard",
    },
  ];

  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      
      {/* =====================================================
          LEFT COLUMN — LISTE DES DISCUSSIONS
      ===================================================== */}
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
        </div>

        <div className="messages-search">
          <input
            type="text"
            placeholder="Rechercher un ami ou une discussion"
          />
        </div>

        <div className="messages-list">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className={`conversation-item ${
                activeChat?.id === friend.id ? "active" : ""
              }`}
              onClick={() => setActiveChat(friend)}
            >
              <img
                src={friend.avatar}
                alt={friend.name}
                className="conversation-avatar"
              />

              <div className="conversation-info">
                <div className="conversation-name">
                  {friend.name}
                </div>
                <div className="conversation-last-message">
                  {friend.lastMessage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* =====================================================
          RIGHT COLUMN — CHAT
      ===================================================== */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Sélectionne une conversation</h3>
            <p>
              Choisis un ami ou une discussion pour commencer à échanger.
            </p>
          </div>
        ) : (
          <>
            {/* ================= HEADER DU CHAT ================= */}
            <div className="chat-header">
              <img
                src={activeChat.avatar}
                alt={activeChat.name}
                className="chat-avatar"
              />
              <div className="chat-user-info">
                <div className="chat-username">
                  {activeChat.name}
                </div>
                <div className="chat-status">
                  En ligne
                </div>
              </div>
            </div>

            {/* ================= BODY DU CHAT ================= */}
            <div className="chat-body">
              <div className="chat-empty">
                Aucun message pour le moment
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
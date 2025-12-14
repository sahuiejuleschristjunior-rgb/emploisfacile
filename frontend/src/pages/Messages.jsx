// frontend/src/pages/Messages.jsx
import React, { useState } from "react";
import "../styles/messages.css";

export default function Messages() {
  // =====================================================
  // STATE
  // =====================================================
  const [activeChat, setActiveChat] = useState(false);

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
          {/* Placeholder — sera remplacé par les amis */}
          <div
            className="messages-empty"
            onClick={() => setActiveChat(true)}
          >
            Aucun ami ou conversation
            <br />
            <small>(tap ici pour ouvrir le chat)</small>
          </div>
        </div>
      </aside>

      {/* =====================================================
          RIGHT COLUMN — CONTENU DU CHAT
      ===================================================== */}
      <main className="messages-content">
        <div className="messages-placeholder">
          <h3>Sélectionne une conversation</h3>
          <p>
            Choisis un ami ou une discussion pour commencer à échanger.
          </p>
        </div>
      </main>

    </div>
  );
}
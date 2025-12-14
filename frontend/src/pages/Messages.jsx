// frontend/src/pages/Messages.jsx
import { useState } from "react";
import "../styles/messages.css";

export default function Messages() {
  const [activeChat, setActiveChat] = useState(false);

  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      
      {/* ================= LEFT COLUMN ================= */}
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
          <div
            className="messages-empty"
            onClick={() => setActiveChat(true)}
          >
            Aucun ami ou conversation  
            <span>(tap ici pour ouvrir le chat)</span>
          </div>
        </div>
      </aside>

      {/* ================= RIGHT COLUMN ================= */}
      <main className="messages-content">
        
        {/* HEADER CHAT (mobile only) */}
        <div className="messages-chat-header">
          <button
            className="messages-back"
            onClick={() => setActiveChat(false)}
          >
            ←
          </button>
          <span>Sélectionne une conversation</span>
        </div>

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
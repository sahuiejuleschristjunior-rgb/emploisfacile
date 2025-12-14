// frontend/src/pages/Messages.jsx
import React from "react";
import "../styles/messages.css";

export default function Messages() {
  return (
    <div className="messages-page">
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
          {/* Placeholder – amis / conversations viendront ici */}
          <div className="messages-empty">
            Aucun ami ou conversation
          </div>
        </div>
      </aside>

      {/* ================= RIGHT COLUMN ================= */}
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
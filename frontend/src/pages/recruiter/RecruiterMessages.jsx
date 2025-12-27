import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Dashboard.css";

export default function RecruiterMessages() {
  const nav = useNavigate();

  return (
    <div className="rd-shell">
      <main className="rd-main">
        <div className="rd-center">
          <section className="rd-card rd-analytics">
            <div className="rd-card-header">
              <h3>Messagerie</h3>
              <button className="view-link" onClick={() => nav("/messages")}>
                Ouvrir la boîte de réception
              </button>
            </div>
            <p className="app-meta">
              Retrouvez vos conversations en temps réel. Les notifications restent actives
              via le header du dashboard.
            </p>
            <div className="rd-kanban">
              <div className="rd-kanban-col">
                <div className="rd-kanban-title">Conversations récentes</div>
                <div className="rd-kanban-item">Suivi candidat · Dernier message il y a 2h</div>
                <div className="rd-kanban-item">Nouveau lead · Dernier message hier</div>
              </div>
              <div className="rd-kanban-col">
                <div className="rd-kanban-title">Actions rapides</div>
                <div className="rd-kanban-item">Configurer un message d'absence</div>
                <div className="rd-kanban-item">Partager un lien d'entretien</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

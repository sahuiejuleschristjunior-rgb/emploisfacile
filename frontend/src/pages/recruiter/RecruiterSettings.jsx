import React from "react";
import "../../styles/Dashboard.css";

export default function RecruiterSettings() {
  return (
    <div className="rd-shell">
      <main className="rd-main">
        <div className="rd-center">
          <section className="rd-card rd-analytics">
            <div className="rd-card-header">
              <h3>Paramètres</h3>
              <span className="rd-chip">Compte</span>
            </div>
            <div className="rd-analytics-grid">
              <div className="rd-analytics-side">
                <div className="rd-analytics-stat">
                  <div className="label">Notifications</div>
                  <div className="value">Activées</div>
                  <div className="hint">Modifiez vos alertes dans la messagerie.</div>
                </div>
                <div className="rd-analytics-stat">
                  <div className="label">Sécurité</div>
                  <div className="value">2FA recommandé</div>
                  <div className="hint">Ajoutez une étape via l'email.</div>
                </div>
              </div>
              <div className="rd-analytics-chart">
                <div className="rd-bar-row">
                  <div className="rd-bar" style={{ width: "60%" }} />
                  <span>Visibilité des offres</span>
                </div>
                <div className="rd-bar-row">
                  <div className="rd-bar" style={{ width: "45%" }} />
                  <span>Temps moyen de réponse</span>
                </div>
                <div className="rd-bar-row">
                  <div className="rd-bar" style={{ width: "75%" }} />
                  <span>Collaborateurs actifs</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

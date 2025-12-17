import React from "react";
import LeftMenuDesktop from "../components/LeftMenuDesktop";
import JobFeed from "../components/JobFeed";

export default function EmploisPage() {
  return (
    <div className="jobfeed-shell">
      <div className="jobfeed-columns">
        <aside className="jobfeed-left">
          <LeftMenuDesktop />
        </aside>

        <main className="jobfeed-main">
          <JobFeed />
        </main>

        <aside className="jobfeed-right">
          <div className="jobfeed-widget">
            <div className="jobfeed-widget__header">
              <span className="material-icons">bolt</span>
              <div>
                <p className="jobfeed-widget__eyebrow">Actions rapides</p>
                <p className="jobfeed-widget__title">Gagner du temps</p>
              </div>
            </div>
            <div className="jobfeed-quickgrid">
              <button className="jobfeed-chip">Mettre à jour mon CV</button>
              <button className="jobfeed-chip">Suivre mes candidatures</button>
              <button className="jobfeed-chip">Créer une alerte</button>
              <button className="jobfeed-chip">Publier une offre</button>
            </div>
          </div>

          <div className="jobfeed-widget">
            <div className="jobfeed-widget__header">
              <span className="material-icons">groups</span>
              <div>
                <p className="jobfeed-widget__eyebrow">Contacts</p>
                <p className="jobfeed-widget__title">À proximité</p>
              </div>
            </div>
            <ul className="jobfeed-contact-list">
              <li>
                <span className="jobfeed-dot online" />
                <span className="jobfeed-contact-name">Sarah - Recruteuse</span>
              </li>
              <li>
                <span className="jobfeed-dot" />
                <span className="jobfeed-contact-name">Fabrice - Coach CV</span>
              </li>
              <li>
                <span className="jobfeed-dot" />
                <span className="jobfeed-contact-name">Noël - Réseaux</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

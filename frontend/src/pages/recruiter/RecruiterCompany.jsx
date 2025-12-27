import React, { useEffect, useState } from "react";
import "../../styles/Dashboard.css";

export default function RecruiterCompany() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <div className="rd-shell">
      <main className="rd-main">
        <div className="rd-center">
          <section className="rd-card">
            <div className="rd-card-header">
              <h3>Profil entreprise</h3>
              <span className="rd-chip">Vue publique</span>
            </div>
            <p className="app-meta">Complétez les informations visibles sur vos offres.</p>

            <div className="rd-kanban">
              <div className="rd-kanban-col">
                <div className="rd-kanban-title">Identité</div>
                <div className="rd-kanban-item">Nom : {user?.companyName || user?.name}</div>
                <div className="rd-kanban-item">Secteur : {user?.industry || "Non renseigné"}</div>
                <div className="rd-kanban-item">Localisation : {user?.location || "Non renseigné"}</div>
              </div>
              <div className="rd-kanban-col">
                <div className="rd-kanban-title">Contact</div>
                <div className="rd-kanban-item">Email : {user?.email || "Non renseigné"}</div>
                <div className="rd-kanban-item">
                  Téléphone : {user?.phone || user?.phoneNumber || "Non renseigné"}
                </div>
                <div className="rd-kanban-item">Site web : {user?.website || "Non renseigné"}</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

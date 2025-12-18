// src/components/MobileMenu.jsx
import React from "react";
import "./MobileMenu.css"; // ATTENTION à la majuscule
import LeftMenu from "./LeftMenu";

export default function MobileMenu({ open, onClose, user, role }) {
  const suggestions = [
    {
      name: "Orange Côte d'Ivoire",
      role: "Entreprise vérifiée",
      avatar: "https://i.pravatar.cc/150?img=12",
    },
    {
      name: "Talent CI",
      role: "Recrutement",
      avatar: "https://i.pravatar.cc/150?img=8",
    },
    {
      name: "Candidat Pro",
      role: "En recherche active",
      avatar: "https://i.pravatar.cc/150?img=20",
    },
  ];

  return (
    <>
      {/* OVERLAY */}
      <div
        className={`mobile-menu-overlay ${open ? "show" : ""}`}
        onClick={onClose}
      />

      {/* PANEL */}
      <div
        className={`mobile-menu-panel ${open ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======== BOUTON FERMER STYLE CHATGPT ======== */}
        <button className="mobile-menu-close" onClick={onClose}>
          ✕
        </button>

        {/* ======== PROFIL EN LIGNE ======== */}
        <div className="mobile-menu-profile-row">
          <img
            src={
              user?.avatar ||
              "https://i.pravatar.cc/200"
            }
            alt="avatar"
            className="mobile-profile-avatar"
          />

          <div className="mobile-profile-info">
            <p className="mobile-profile-name">
              {user?.name || "Utilisateur"}
            </p>

            <p className="mobile-profile-role">
              {role === "recruteur" ? "Recruteur" : "Candidat"}
            </p>
          </div>
        </div>

        <div className="mobile-menu-columns">
          {/* ======== LISTE DES MENUS ======== */}
          <div className="mobile-menu-items">
            <LeftMenu role={role} menuOpen={open} setMenuOpen={onClose} />
          </div>

          {/* ======== SUGGESTIONS (RIGHT MENU) ======== */}
          <div className="mobile-right-block">
            <div className="mobile-right-header">
              <span className="material-icons">explore</span>
              <h3>À découvrir</h3>
            </div>

            <div className="mobile-right-list">
              {suggestions.map((item) => (
                <div key={item.name} className="mobile-right-item">
                  <img src={item.avatar} alt="avatar" />

                  <div className="mobile-right-info">
                    <p className="mobile-right-name">{item.name}</p>
                    <span className="mobile-right-role">{item.role}</span>
                  </div>

                  <button className="mobile-right-follow">Suivre</button>
                </div>
              ))}
            </div>

            <div className="mobile-right-ads">
              <p className="mobile-right-ads-title">Publicités</p>
              <div className="mobile-right-ad">Votre annonce ici</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

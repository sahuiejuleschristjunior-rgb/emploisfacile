import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

export default function RecruiterMessages() {
  const navigate = useNavigate();

  return (
    <>
      <div className="rd-page-header">
        <div>
          <h2>Messages</h2>
          <p>Accédez à la messagerie pour répondre aux candidats.</p>
        </div>
      </div>

      <section className="rd-card">
        <p style={{ color: "var(--muted)", margin: 0 }}>
          La messagerie conserve ses fonctionnalités existantes. Utilisez le
          bouton ci-dessous pour ouvrir la boîte de réception.
        </p>

        <div style={{ marginTop: 16 }}>
          <button className="rd-btn" onClick={() => navigate("/messages")}>Accéder aux messages</button>
        </div>
      </section>
    </>
  );
}

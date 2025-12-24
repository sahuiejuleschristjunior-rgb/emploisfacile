import { useEffect, useState } from "react";
import "../styles/appOverlay.css";

export default function AppLoadingOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-overlay">
      <div className="overlay-card">
        <div className="overlay-logo">EF</div>
        <div className="overlay-title">Bienvenue</div>
        <div className="overlay-subtitle">
          Préparation de votre expérience…
        </div>

        <div className="overlay-loader">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}

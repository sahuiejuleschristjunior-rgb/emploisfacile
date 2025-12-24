import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/appOverlay.css";

function hasToken() {
  const t = localStorage.getItem("token");
  return Boolean(t && t !== "null" && t !== "undefined" && t.split(".").length === 3);
}

export default function AppLoadingOverlay() {
  const location = useLocation();
  const DURATION_MS = 1800;

  // Au refresh: si token existe, on affiche direct
  const [visible, setVisible] = useState(() => hasToken());

  const prevTokenRef = useRef(hasToken());
  const timerRef = useRef(null);

  const showFor = (ms = DURATION_MS) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, ms);
  };

  // 1) Cas refresh: visible true via initState, on cache après durée
  useEffect(() => {
    if (visible) showFor(DURATION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Cas login SPA: sur navigation, si token apparaît, on montre
  useEffect(() => {
    const nowHasToken = hasToken();
    const prevHasToken = prevTokenRef.current;

    if (!prevHasToken && nowHasToken) {
      showFor(DURATION_MS);
    }

    prevTokenRef.current = nowHasToken;
  }, [location.key]);

  // 3) Fallback: si token apparaît sans navigation, on le détecte pendant 2s max
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const interval = setInterval(() => {
      if (cancelled) return;
      tries += 1;

      const nowHasToken = hasToken();
      const prevHasToken = prevTokenRef.current;

      if (!prevHasToken && nowHasToken) {
        showFor(DURATION_MS);
        prevTokenRef.current = true;
        clearInterval(interval);
      }

      if (tries >= 20) clearInterval(interval); // 20 * 100ms = 2s
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="app-overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="overlay-logo">EF</div>
        <div className="overlay-title">Bienvenue</div>
        <div className="overlay-subtitle">Préparation de votre expérience…</div>

        <div className="overlay-progress" aria-hidden="true">
          <div className="overlay-bar"></div>
        </div>

        <div className="overlay-hint">Synchronisation en cours</div>
      </div>
    </div>
  );
}

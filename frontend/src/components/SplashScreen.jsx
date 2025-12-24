import "../styles/splash.css";

export default function SplashScreen() {
  return (
    <div className="splash-root">
      <div className="splash-logo">EF</div>
      <div className="splash-spinner"></div>
      <div className="splash-text">
        Chargement de votre fil d’actualité…
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import FBIcon from "./FBIcon";

export default function FacebookBottomNav({
  onNavigate,
  onSearch,
  onMenu,
  isJobsFeed = false,
}) {
  const navigate = useNavigate();
  const handleNavigate = onNavigate || ((path, options = {}) => navigate(path, options));

  const handleSearch = () => {
    if (isJobsFeed) return;
    if (onSearch) {
      onSearch();
      return;
    }
    handleNavigate("/fb");
  };

  const handleMenu = () => {
    if (isJobsFeed) return;
    if (onMenu) {
      onMenu();
      return;
    }
    handleNavigate("/fb");
  };

  return (
    <nav className="fb-bottom-nav">
      <div className="fb-bottom-nav-inner">
        <div className="fb-bottom-nav-item" onClick={() => handleNavigate("/fb")}>
          <FBIcon name="home" size={22} />
          <div>Accueil</div>
        </div>

        <div className="fb-bottom-nav-item" onClick={() => handleNavigate("/emplois")}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect x="3" y="6" width="18" height="14" rx="3" stroke="#FFFFFF" strokeWidth="1.6" />
            <path
              d="M9 6V5.2C9 4 10 3 11.2 3h1.6C14 3 15 4 15 5.2V6"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path d="M4.6 10.5h14.8" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8.2" cy="13" r="1.6" stroke="#FFFFFF" strokeWidth="1.4" />
            <line
              x1="11.2"
              y1="12.8"
              x2="18"
              y2="12.8"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <line
              x1="11.2"
              y1="15.4"
              x2="16.8"
              y2="15.4"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <div>Emplois</div>
        </div>

        <div className="fb-bottom-nav-item" onClick={handleSearch}>
          <FBIcon name="search" size={22} />
          <div>Recherche</div>
        </div>

        <div className="fb-bottom-nav-item" onClick={() => handleNavigate("/fb/dashboard")}>
          <FBIcon name="dashboard" size={22} />
          <div>Tableau</div>
        </div>

        <div className="fb-bottom-nav-item" onClick={handleMenu}>
          <FBIcon name="profile" size={22} />
          <div>Menu</div>
        </div>
      </div>
    </nav>
  );
}

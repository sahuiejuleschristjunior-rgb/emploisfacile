import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Outlet, useLocation, Navigate } from "react-router-dom";
import NotificationItem from "../components/NotificationItem";
import "../styles/facebook-layout.css";
import { getAvatarStyle } from "../utils/imageUtils";
import FBIcon from "../components/FBIcon";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";

export default function FacebookLayout() {
  const location = useLocation();
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const { token: authToken, user: authUser, logout } = useAuth();

  if (location.pathname.startsWith("/login")) return <Outlet />;
  if (!authToken)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (!authUser)
    return (
      <div className="fb-loading-screen">
        <div className="loader">Chargement...</div>
      </div>
    );

  const makeHeaders = (json = false) => {
    if (!authToken)
      return json ? { "Content-Type": "application/json" } : {};

    return json
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        }
      : {
          Authorization: `Bearer ${authToken}`,
        };
  };

  const [currentUser, setCurrentUser] = useState(authUser);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const socketRef = useRef(null);
  const notifIdsRef = useRef(new Set());
  const messageIdsRef = useRef(new Set());
  const [toast, setToast] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const [searchResults, setSearchResults] = useState({
    users: [],
    posts: [],
    jobs: [],
  });

  const searchBoxRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  /* ============================================================
     🔥 SOCKET
  ============================================================ */
  useEffect(() => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    if (!authToken) return;

    const SOCKET_URL = "https://emploisfacile.org";

    const s = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token: authToken || "" },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 20,
    });

    s.on("connect", () => console.log("📡 Socket connecté :", s.id));
    s.on("disconnect", () => console.log("📡 Socket déconnecté"));

    socketRef.current = s;

    return () => {
      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [authToken]);

  /* ============================================================
     🔥 REALTIME NOTIFS — (Version corrigée : anti-duplicat & anti-retour)
  ============================================================ */
  const pushRealtimeNotification = useCallback(
    (notif) => {
      if (!notif) return;

      // 🔥 1 — Empêche les notifs déjà traitées (handled)
      if (notif.handled) return;

      // 🔥 2 — Empêche les notifs déjà lues
      if (notif.read === true) return;

      // 🔥 3 — Anti-doublons socket
      const id = notif._id || notif.id;
      if (id) {
        if (notifIdsRef.current.has(id)) return;
        notifIdsRef.current.add(id);
      }

      // 🔥 4 — On ajoute proprement
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      showToast("Nouvelle notification");
    },
    []
  );

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handler = (n) => pushRealtimeNotification(n);

    s.on("notification:new", handler);
    s.on("notification", handler);

    return () => {
      try {
        s.off("notification:new", handler);
        s.off("notification", handler);
      } catch {}
    };
  }, [pushRealtimeNotification]);

  /* ============================================================
     🔥 REALTIME MESSAGES
  ============================================================ */
  const pushRealtimeMessage = useCallback(
    (payload) => {
      if (!payload) return;

      const msg = payload.message || payload.data || payload.msg || payload;
      const id = msg?._id || payload.messageId || payload.id;

      if (id) {
        if (messageIdsRef.current.has(id)) return;
        messageIdsRef.current.add(id);
      }

      if (location.pathname.startsWith("/messages")) return;

      setUnreadMessagesCount((prev) => prev + 1);
      showToast("Nouveau message reçu");
    },
    [location.pathname]
  );

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handler = (p) => pushRealtimeMessage(p);

    s.on("message:new", handler);
    s.on("new_message", handler);

    return () => {
      try {
        s.off("message:new", handler);
        s.off("new_message", handler);
      } catch {}
    };
  }, [pushRealtimeMessage]);

  /* ============================================================
     🔍 SEARCH 
  ============================================================ */
  const performSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults({ users: [], posts: [], jobs: [] });
      return;
    }

    setLoadingSearch(true);

    try {
      const res = await fetch(
        `${API_URL}/search/global?q=${encodeURIComponent(searchTerm)}`,
        { headers: makeHeaders() }
      );

      const data = await res.json();

      if (res.ok) {
        setSearchResults({
          users: data.users || [],
          posts: data.posts || [],
          jobs: data.jobs || [],
        });
      }
    } catch (err) {
      console.error("Erreur recherche :", err);
    } finally {
      setLoadingSearch(false);
    }
  }, [searchTerm, API_URL]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm.trim()) performSearch();
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, performSearch]);

  /* ============================================================
     🔥 LOAD NOTIFICATIONS
  ============================================================ */
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: makeHeaders(),
      });

      const data = await res.json();

      if (res.ok) {
        setNotifications(data);
        const unread = data.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Erreur notif :", err);
    }
  }, [API_URL]);

  /* ============================================================
     🔥 UNREAD COUNT AUTO REFRESH
  ============================================================ */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/unread/count`, {
        headers: makeHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();

      if (typeof data.count === "number") {
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error("Erreur count :", err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    setCurrentUser(authUser);
  }, [authUser]);

  /* ============================================================
     🔥 LOGOUT
  ============================================================ */
  const handleLogout = () => {
    try {
      logout();
    } catch (err) {
      console.error("Logout error:", err);
    }

    nav("/login", { replace: true });

    setTimeout(() => {
      if (!localStorage.getItem("token")) {
        window.location.href = "/login";
      }
    }, 150);
  };

  const avatarStyle = getAvatarStyle(currentUser?.avatar);

  const renderSearchContent = () => {
    if (loadingSearch)
      return <div className="fb-search-loader">Recherche...</div>;

    const hasResults =
      searchResults.users.length > 0 ||
      searchResults.posts.length > 0 ||
      searchResults.jobs.length > 0;

    if (!searchTerm.trim())
      return (
        <div className="fb-search-empty">
          Commencez à taper pour rechercher
        </div>
      );

    if (!hasResults)
      return <div className="fb-search-empty">Aucun résultat</div>;

    return (
      <>
        {searchResults.users.length > 0 && (
          <div className="fb-search-section">
            <div className="fb-search-title">Utilisateurs</div>
            {searchResults.users.map((u) => (
              <div
                key={u._id}
                className="fb-search-item"
                onClick={() => {
                  nav(`/profil/${u._id}`);
                  setSearchOpen(false);
                  setShowMobileSearch(false);
                }}
              >
                <img
                  src={u.avatar || "https://i.pravatar.cc/150"}
                  alt="avatar"
                />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        )}

        {searchResults.posts.length > 0 && (
          <div className="fb-search-section">
            <div className="fb-search-title">Publications</div>
            {searchResults.posts.map((p) => (
              <div
                key={p._id}
                className="fb-search-item"
                onClick={() => {
                  nav(`/fb/post/${p._id}`);
                  setSearchOpen(false);
                  setShowMobileSearch(false);
                }}
              >
                <img
                  src={p.author?.avatar || "https://i.pravatar.cc/150"}
                  alt="avatar"
                />
                <span>{p.content?.slice(0, 70) || "(Sans contenu)"}</span>
              </div>
            ))}
          </div>
        )}

        {searchResults.jobs.length > 0 && (
          <div className="fb-search-section">
            <div className="fb-search-title">Emplois</div>
            {searchResults.jobs.map((j) => (
              <div
                key={j._id}
                className="fb-search-item"
                onClick={() => {
                  nav(`/emplois/${j._id}`);
                  setSearchOpen(false);
                  setShowMobileSearch(false);
                }}
              >
                <img src={j.companyLogo || "https://i.pravatar.cc/150"} />
                <span>{j.title}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  /* ============================================================
     🚀 RENDER UI
  ============================================================ */
  return (
    <div className="fb-app fb-app--with-bottom-nav">
      {/* HEADER */}
      <header className="fb-header">
        <div className="fb-header-inner">
          
          {/* LOGO */}
          <div className="fb-header-left" onClick={() => nav("/fb")}>
            <div className="fb-logo"><span>EF</span></div>
            <span className="fb-logo-label">EmploisFacile</span>
          </div>

          {/* SEARCH BAR */}
          <div className="fb-header-search-wrapper" ref={searchBoxRef}>
            <div className="fb-header-search">
              <FBIcon name="search" size={18} />
              <input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
            </div>

            {searchOpen && (
              <div className="fb-search-dropdown">
                {renderSearchContent()}
              </div>
            )}
          </div>

          {/* RIGHT ACTIONS */}
          <div className="fb-header-right">

            <button className="fb-header-icon-btn" onClick={() => nav("/fb")}>
              <FBIcon name="home" size={22} />
            </button>

            <button className="fb-header-icon-btn" onClick={() => nav("/fb/relations")}>
              <FBIcon name="friends" size={22} />
            </button>

            <button className="fb-header-icon-btn" onClick={() => nav("/messages")}>
              <div style={{ position: "relative" }}>
                <FBIcon name="messages" size={22} />
                {unreadMessagesCount > 0 && (
                  <span className="notif-badge">{unreadMessagesCount}</span>
                )}
              </div>
            </button>

            {/* NOTIFS ICON */}
            <div className="notif-wrapper">
              <button
                className="fb-header-icon-btn notif-btn"
                onClick={() => {
                  loadNotifications();
                  setIsDropdownOpen((v) => !v);
                }}
              >
                <FBIcon name="notif" size={22} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {/* NOTIFS DROPDOWN */}
              {isDropdownOpen && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <h2>Notifications</h2>
                    <button
                      className="notif-all-btn"
                      onClick={() => {
                        nav("/notifications");
                        setIsDropdownOpen(false);
                      }}
                    >
                      Tout voir
                    </button>
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">Aucune notification.</div>
                    ) : (
                      notifications.map((notif) => (
                        <NotificationItem
                          key={notif._id}
                          notif={notif}
                          onHandled={(id, extra) => {
                            
                            // 🔥 Empêche le retour de la notif via socket
                            if (extra?.handled) {
                              notifIdsRef.current.add(id);
                            }

                            setNotifications((prev) =>
                              prev.filter((n) => n._id !== id)
                            );

                            setUnreadCount((c) => Math.max(0, c - 1));
                          }}
                          onClick={() => setIsDropdownOpen(false)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PROFILE */}
            <button
              className="fb-header-icon-btn"
              onClick={() => nav(`/profil/${currentUser?._id}`)}
            >
              <div className="fb-header-avatar" style={avatarStyle} />
            </button>
          </div>
        </div>
      </header>

      {/* APP BODY */}
      <main className="fb-app-body">
        <div className="fb-layout">
          <aside className="fb-left-column">
            <div className="fb-left-section">
              <div className="fb-sidebar-group">
                <div
                  className="fb-sidebar-item"
                  onClick={() => nav(`/profil/${currentUser?._id}`)}
                >
                  <div className="fb-sidebar-item-icon" style={avatarStyle}>
                    {!currentUser?.avatar && <span>🙂</span>}
                  </div>
                  <div className="fb-sidebar-item-label">
                    {currentUser?.name || "Mon Profil"}
                  </div>
                </div>
              </div>

              <div className="fb-sidebar-group">
                <div className="fb-sidebar-group-header">Navigation</div>

                <div className="fb-sidebar-item" onClick={() => nav("/fb")}>
                  <FBIcon name="home" size={20} />
                  <div className="fb-sidebar-item-label">Accueil</div>
                </div>

                <div className="fb-sidebar-item" onClick={() => nav("/emplois")}>
                  <FBIcon name="jobs" size={20} />
                  <div className="fb-sidebar-item-label">Tableau de bord</div>
                </div>

                <div className="fb-sidebar-item" onClick={() => nav("/notifications")}>
                  <FBIcon name="notif" size={20} />
                  <div className="fb-sidebar-item-label">Notifications</div>
                </div>

                <div className="fb-sidebar-item" onClick={() => nav("/fb/relations")}>
                  <FBIcon name="friends" size={20} />
                  <div className="fb-sidebar-item-label">Relations</div>
                </div>

                <div
                  className="fb-sidebar-item fb-sidebar-settings"
                  onClick={() => setShowSettings((prev) => !prev)}
                >
                  <FBIcon name="settings" size={20} />
                  <div className="fb-sidebar-item-label">Paramètres</div>
                </div>

                {showSettings && (
                  <div className="fb-sidebar-submenu">
                    <div className="fb-sidebar-subitem" onClick={() => nav("/settings")}>
                      <FBIcon name="settings" size={18} />
                      <span>Général</span>
                    </div>

                    <div
                      className="fb-sidebar-subitem fb-sidebar-subitem-logout"
                      onClick={handleLogout}
                    >
                      <FBIcon name="logout" size={18} />
                      <span>Déconnexion</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="fb-center-column">
            <Outlet />
          </section>

          <aside className="fb-right-column"></aside>
        </div>
      </main>

      {/* BOTTOM NAV */}
      <nav className="fb-bottom-nav">
        <div className="fb-bottom-nav-inner">

          <div className="fb-bottom-nav-item" onClick={() => nav("/fb")}>
            <FBIcon name="home" size={22} />
            <div>Accueil</div>
          </div>

          <div className="fb-bottom-nav-item" onClick={() => nav("/emplois")}>
            <FBIcon name="jobs" size={22} />
            <div>Emplois</div>
          </div>

          <div
            className="fb-bottom-nav-item"
            onClick={() => {
              setShowMobileSearch(true);
              setSearchOpen(true);
            }}
          >
            <FBIcon name="search" size={22} />
            <div>Recherche</div>
          </div>

          <div className="fb-bottom-nav-item" onClick={() => nav("/fb/relations")}>
            <FBIcon name="friends" size={22} />
            <div>Relations</div>
          </div>

          <div className="fb-bottom-nav-item" onClick={() => nav("/messages")}>
            <FBIcon name="messages" size={22} />
            <div>Messages</div>
          </div>

          <div className="fb-bottom-nav-item" onClick={() => setShowMobileMenu(true)}>
            <FBIcon name="profile" size={22} />
            <div>Menu</div>
          </div>
        </div>
      </nav>

      {/* FULLSCREEN MENU */}
      {showMobileMenu && (
        <div className="fullscreen-menu">
          <div className="fs-menu-header">
            <h2>Menu</h2>
            <button onClick={() => setShowMobileMenu(false)}>✖</button>
          </div>

          <div className="fs-menu-profile">
            <div className="fs-avatar" style={avatarStyle}></div>
            <div className="fs-name">{currentUser?.name}</div>
          </div>

          <div className="fs-menu-grid">
            <div className="fs-item" onClick={() => nav("/emplois")}>
              <FBIcon name="jobs" size={22} />
              <span>Tableau de bord</span>
            </div>

            <div className="fs-item" onClick={() => nav("/fb")}>
              <FBIcon name="home" size={22} />
              <span>Fils</span>
            </div>

            <div className="fs-item" onClick={() => nav("/fb/relations")}>
              <FBIcon name="friends" size={22} />
              <span>Découvrir</span>
            </div>

            <div className="fs-item" onClick={() => nav("/settings")}>
              <FBIcon name="settings" size={22} />
              <span>Paramètres</span>
            </div>

            <div className="fs-item logout" onClick={handleLogout}>
              <FBIcon name="logout" size={22} />
              <span>Déconnexion</span>
            </div>
          </div>
        </div>
      )}

      {showMobileSearch && (
        <div
          className="fb-mobile-search-modal"
          onClick={() => {
            setShowMobileSearch(false);
            setSearchOpen(false);
          }}
        >
          <div
            className="fb-mobile-search-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fb-mobile-search-header">
              <FBIcon name="search" size={20} />
              <input
                value={searchTerm}
                placeholder="Rechercher..."
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
              />
              <button
                className="fb-mobile-search-close"
                onClick={() => {
                  setShowMobileSearch(false);
                  setSearchOpen(false);
                }}
              >
                ✖
              </button>
            </div>

            <div className="fb-mobile-search-results">{renderSearchContent()}</div>
          </div>
        </div>
      )}

      {toast && <div className="fb-toast">{toast}</div>}
    </div>
  );
}

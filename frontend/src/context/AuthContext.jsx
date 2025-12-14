import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  /* ============================================================
     ÉTATS
  ============================================================ */
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  /* ============================================================
     🔥 fetchUser — pour recharger le user depuis /auth/me
  ============================================================ */
  const fetchUser = useCallback(
    async (jwt, { silent = false } = {}) => {
      if (!jwt) return;

      if (!silent) setLoading(true);

      try {
        const res = await fetch(import.meta.env.VITE_API_URL + "/auth/me", {
          headers: { Authorization: "Bearer " + jwt },
        });

        if (!res.ok) {
          console.warn("auth/me failed");
          return;
        }

        const data = await res.json();

        if (data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (err) {
        console.error("fetchUser error:", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  /* ============================================================
     🔥 Initialisation au montage
  ============================================================ */
  useEffect(() => {
    let active = true;

    async function init() {
      if (!token) {
        setLoading(false);
        return;
      }

      await fetchUser(token, { silent: true });

      if (active) setLoading(false);
    }

    init();

    return () => {
      active = false;
    };
  }, [token, fetchUser]);

  /* ============================================================
     🔥 login(jwt, userData)
  ============================================================ */
  function login(jwt, userData = null) {
    localStorage.setItem("token", jwt);
    setToken(jwt);

    if (userData) {
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return;
    }

    // Recharge proprement
    fetchUser(jwt, { silent: true });
  }

  /* ============================================================
     🔥 logout — VERSION ANTI ÉCRAN NOIR
     → On active loading pour bloquer le rendu
     → On laisse le router rediriger
     → Puis on nettoie les states
  ============================================================ */
  function logout() {
    // Empêche les pages protégées de planter
    setLoading(true);

    // Nettoyage stockage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Petit délai pour laisser React Router démonter la page
    setTimeout(() => {
      setUser(null);
      setToken(null);
      setLoading(false);
    }, 80); // 80ms = valeur parfaite pour éviter l'écran noir
  }

  /* ============================================================
     🔥 refreshUser — manuel
  ============================================================ */
  function refreshUser() {
    if (!token) return;
    fetchUser(token);
  }

  /* ============================================================
     CONTEXTE
  ============================================================ */
  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    role: user?.role || null,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

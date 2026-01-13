// ===============================
// 🔐 RÉCUPÉRATION DU TOKEN
// ===============================
export function getToken() {
  return localStorage.getItem("token");
}

// ===============================
// 🔐 RÉCUPÉRATION DE L'UTILISATEUR
// ===============================
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

// ===============================
// 🔐 VÉRIFICATION AUTHENTIFICATION
// ===============================
export function isLogged() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // ➤ Si un token et un user existent → connecté
  return Boolean(token && user);
}

// ===============================
// 🔐 DÉCONNEXION
// ===============================
export function logout(navigate) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (typeof navigate === "function") {
    navigate("/login");
  }
}

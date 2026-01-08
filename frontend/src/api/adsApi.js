import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function fetchActiveAds() {
  const res = await fetch(`${API_URL}/ads/active`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erreur lors du chargement des publicités");
  }

  const payload = await res.json();
  return payload?.data || [];
}

export async function trackAdEvent({ sponsoredPostId, type }) {
  const res = await fetch(`${API_URL}/ads/track`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sponsoredPostId, type }),
  });

  if (!res.ok) {
    throw new Error("Erreur lors du tracking de la publicité");
  }

  return res.json();
}

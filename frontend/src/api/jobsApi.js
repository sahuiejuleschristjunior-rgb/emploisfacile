import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function fetchRecentJobs(limit = 5) {
  const res = await fetch(`${API_URL}/jobs/recent?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erreur lors du chargement des offres");
  }

  const payload = await res.json();
  return payload?.data || [];
}

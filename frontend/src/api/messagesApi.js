import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function fetchMessageRequests() {
  const res = await fetch(`${API_URL}/messages/requests`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error("Erreur récupération des demandes");
  }
  const data = await res.json();
  return data?.data || [];
}

export async function acceptMessageRequest(id) {
  const res = await fetch(`${API_URL}/messages/requests/${id}/accept`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || "Impossible d'accepter la demande."
    );
  }

  return data;
}

export async function declineMessageRequest(id) {
  const res = await fetch(`${API_URL}/messages/requests/${id}/decline`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de refuser la demande.");
  }

  return data;
}

export async function blockMessageRequest(id) {
  const res = await fetch(`${API_URL}/messages/requests/${id}/block`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de bloquer l'utilisateur.");
  }

  return data;
}

export async function sendMessagePayload(payload) {
  const res = await fetch(`${API_URL}/messages/send`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

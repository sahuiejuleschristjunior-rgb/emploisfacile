import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function unwrapPayload(data) {
  if (!data) return null;
  return data.data || data.conversation || data.conversations || data;
}

export async function fetchJobChatConversations() {
  const res = await fetch(`${API_URL}/conversations`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de charger les conversations.");
  }

  const list = unwrapPayload(data);
  return Array.isArray(list) ? list : [];
}

export async function fetchJobConversation(conversationId) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de charger la conversation.");
  }

  return unwrapPayload(data);
}

export async function createJobConversation({ participants, jobId }) {
  const res = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ participants, jobId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de créer la conversation.");
  }

  return unwrapPayload(data);
}

export async function fetchConversationMessages(conversationId) {
  const res = await fetch(`${API_URL}/messages/conversation/${conversationId}`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Impossible de charger les messages.");
  }

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.data?.messages)) return data.data.messages;
  return [];
}

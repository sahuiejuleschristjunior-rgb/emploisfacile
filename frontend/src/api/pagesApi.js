import { API_URL } from "./config";

function authHeaders(isJson = true) {
  const token = localStorage.getItem("token");
  const headers = isJson ? { "Content-Type": "application/json" } : {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function createPage(payload) {
  const res = await fetch(`${API_URL}/pages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getMyPages() {
  const res = await fetch(`${API_URL}/pages/me`, { headers: authHeaders() });
  return res.json();
}

export async function getPageBySlug(slug) {
  const res = await fetch(`${API_URL}/pages/${slug}`, { headers: authHeaders() });
  return res.json();
}

export async function updatePage(slug, payload) {
  const res = await fetch(`${API_URL}/pages/${slug}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function uploadPageAvatar(slug, file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_URL}/pages/${slug}/avatar`, {
    method: "POST",
    headers: authHeaders(false),
    body: fd,
  });
  return res.json();
}

export async function uploadPageCover(slug, file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_URL}/pages/${slug}/cover`, {
    method: "POST",
    headers: authHeaders(false),
    body: fd,
  });
  return res.json();
}

export async function toggleFollowPage(slug) {
  const res = await fetch(`${API_URL}/pages/${slug}/follow`, {
    method: "POST",
    headers: authHeaders(),
  });
  return res.json();
}

export async function searchPages(q) {
  const res = await fetch(`${API_URL}/pages/search?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function createPagePost(slug, payload = {}, files = []) {
  const fd = new FormData();
  if (payload.text) fd.append("text", payload.text);
  if (payload.media) fd.append("media", JSON.stringify(payload.media));
  files.forEach((f) => fd.append("files", f));

  const res = await fetch(`${API_URL}/page-posts/${slug}`, {
    method: "POST",
    headers: authHeaders(false),
    body: fd,
  });
  return res.json();
}

export async function getPagePosts(slug, page = 1, limit = 10) {
  const res = await fetch(
    `${API_URL}/page-posts/${slug}?page=${page}&limit=${limit}`,
    { headers: authHeaders(false) }
  );
  return res.json();
}

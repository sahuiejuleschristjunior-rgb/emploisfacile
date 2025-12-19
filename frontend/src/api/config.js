// Default to the dedicated API subdomain; normalize common hostnames so we
// always hit the backend instead of the public site (which returns HTML like
// "Cannot POST /api/pages").
const DEFAULT_API = "https://api.emploisfacile.org/api";

function normalizeApiUrl(raw) {
  if (!raw) return DEFAULT_API;

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const normalizedPath = parsed.pathname.replace(/\/$/, "") || "/api";
    const isApiSubdomain = hostname === "api.emploisfacile.org";
    const isPrimaryDomain = hostname === "emploisfacile.org";

    if (isPrimaryDomain && !isApiSubdomain) {
      return `https://api.emploisfacile.org${normalizedPath}`;
    }

    return `${parsed.origin}${normalizedPath}`;
  } catch (err) {
    console.warn("Invalid VITE_API_URL provided, falling back to default", err);
    return DEFAULT_API;
  }
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

// API calls should go through the main domain to avoid certificate mismatch
// errors when the API subdomain certificate is not aligned with the site
// certificate.
const DEFAULT_API = "https://emploisfacile.org/api";

function normalizeApiUrl(raw) {
  if (!raw) return DEFAULT_API;

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const normalizedPath = parsed.pathname.replace(/\/$/, "") || "/api";
    const isPrimaryDomain = hostname === "emploisfacile.org";

    if (isPrimaryDomain) {
      return `https://emploisfacile.org${normalizedPath}`;
    }

    return `${parsed.origin}${normalizedPath}`;
  } catch (err) {
    console.warn("Invalid VITE_API_URL provided, falling back to default", err);
    return DEFAULT_API;
  }
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

const DEFAULT_API = "https://api.emploisfacile.org/api";

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");

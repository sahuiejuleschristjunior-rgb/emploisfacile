export const HOME_PATH = "/";
export const DASHBOARD_PATH = "/fb/dashboard";

export const isNavigationDebugEnabled = () => {
  if (typeof window !== "undefined" && window.__NAVIGATION_DEBUG__ === true) {
    return true;
  }

  return import.meta.env.VITE_NAVIGATION_DEBUG === "true";
};

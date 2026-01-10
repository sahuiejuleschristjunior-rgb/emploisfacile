import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const ROOT_PATHS = new Set([
  "/",
  "/fb",
  "/emplois",
  "/recruiter/dashboard",
  "/candidate/dashboard",
  "/ads",
]);

const normalizePath = (pathname) => {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length ? trimmed : "/";
};

export default function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return undefined;
    }

    let listener;
    let isActive = true;

    const setupListener = async () => {
      const { App } = await import("@capacitor/app");
      if (!isActive) {
        return;
      }

      listener = App.addListener("backButton", (event) => {
        const currentPath = normalizePath(locationRef.current.pathname);
        const isRootPath = ROOT_PATHS.has(currentPath);
        const canGoBack = event?.canGoBack ?? window.history.length > 1;

        if (!isRootPath && canGoBack) {
          navigate(-1);
          return;
        }

        const shouldExit = window.confirm("Voulez-vous quitter l'application ?");
        if (shouldExit) {
          App.exitApp();
        }
      });
    };

    setupListener();

    return () => {
      isActive = false;
      listener?.remove();
    };
  }, [navigate]);
}

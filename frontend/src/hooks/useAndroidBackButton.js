import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const DEFAULT_ROOT_PATHS = [
  "/",
  "/fb",
  "/emplois",
  "/ads",
  "/recruiter/dashboard",
  "/candidate/dashboard",
];

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

const isRootPath = (pathname, rootPaths) => rootPaths.includes(pathname);

const OVERLAY_SELECTORS = [
  ".dashboard-drawer-overlay",
  ".fb-mobile-search-modal",
  ".fb-modal-overlay",
  ".profil-modal-overlay",
  ".fb-sponsor-modal-overlay",
  ".fb-comments-modal-backdrop",
  ".cm-backdrop",
  ".post-edit-modal-backdrop",
  ".ppv-overlay",
  ".global-feedback-overlay",
];

const SHEET_SELECTORS = [
  ".message-actions-sheet",
  ".message-delete-sheet",
  ".reaction-picker",
];

const tryCloseOverlay = () => {
  if (typeof document === "undefined") return false;

  const overlay = document.querySelector(OVERLAY_SELECTORS.join(", "));
  if (overlay) {
    overlay.click?.();
    return true;
  }

  if (document.querySelector(SHEET_SELECTORS.join(", "))) {
    document.body?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    return true;
  }

  return false;
};

export default function useAndroidBackButton(options = {}) {
  const { rootPaths = DEFAULT_ROOT_PATHS } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const rootPathsRef = useRef(rootPaths);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    rootPathsRef.current = rootPaths;
  }, [rootPaths]);

  useEffect(() => {
    if (!isAndroidNative()) {
      return undefined;
    }

    let removeHandler;
    let isActive = true;

    import("@capacitor/app")
      .then(({ App }) => {
        if (!isActive) return;
        const handler = App.addListener("backButton", () => {
          if (tryCloseOverlay()) {
            return;
          }

          const pathname = pathnameRef.current;
          const roots = rootPathsRef.current;

          if (!isRootPath(pathname, roots)) {
            navigate(-1);
            return;
          }

          App.exitApp();
        });

        removeHandler = () => handler.remove();
      })
      .catch((error) => {
        console.warn("[android-back-button] listener disabled:", error);
      });

    return () => {
      isActive = false;
      if (removeHandler) {
        try {
          removeHandler();
        } catch (error) {
          console.warn("[android-back-button] cleanup failed:", error);
        }
      }
    };
  }, [navigate]);
}

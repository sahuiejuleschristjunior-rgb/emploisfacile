import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { HOME_PATH, isNavigationDebugEnabled } from "./constants";
import { useNavigationStack } from "./NavigationStackProvider";

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

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
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    return true;
  }

  return false;
};

export default function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stack, overlayCloseHandler } = useNavigationStack();
  const navigateRef = useRef(navigate);
  const stackRef = useRef(stack);
  const locationRef = useRef(location);
  const overlayCloseRef = useRef(overlayCloseHandler);
  const debugEnabledRef = useRef(isNavigationDebugEnabled());

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    overlayCloseRef.current = overlayCloseHandler;
  }, [overlayCloseHandler]);

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
          const currentLocation = locationRef.current;
          const currentPath = currentLocation?.pathname || "";
          const currentStack = stackRef.current || [];

          const overlayHandled =
            overlayCloseRef.current?.() || tryCloseOverlay();

          if (overlayHandled) {
            if (debugEnabledRef.current) {
              console.debug("[android-back] overlay closed", {
                route: currentPath,
                stackLength: currentStack.length,
              });
            }
            return;
          }

          if (currentStack.length > 1) {
            if (debugEnabledRef.current) {
              console.debug("[android-back] navigate back", {
                route: currentPath,
                stackLength: currentStack.length,
              });
            }
            navigateRef.current(-1);
            return;
          }

          if (currentPath !== HOME_PATH) {
            if (debugEnabledRef.current) {
              console.debug("[android-back] go home", {
                route: currentPath,
                stackLength: currentStack.length,
                home: HOME_PATH,
              });
            }
            navigateRef.current(HOME_PATH);
            return;
          }

          if (debugEnabledRef.current) {
            console.debug("[android-back] exit app", {
              route: currentPath,
              stackLength: currentStack.length,
            });
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
  }, []);
}

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { DASHBOARD_PATH, HOME_PATH, isNavigationDebugEnabled } from "./constants";
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

const DASHBOARD_PATHS = [
  DASHBOARD_PATH,
  "/candidate/dashboard",
  "/recruiter/dashboard",
  "/jobconnect/dashboard",
];

const buildRouteKey = (location) =>
  `${location?.pathname ?? ""}${location?.search ?? ""}${location?.hash ?? ""}`;

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

const showExitPrompt = async (message) => {
  if (typeof window !== "undefined") {
    const toastPlugin = window?.Capacitor?.Plugins?.Toast;
    if (toastPlugin?.show) {
      try {
        await toastPlugin.show({ text: message, duration: "short" });
        return;
      } catch (error) {
        console.debug("[android-back] toast failed", error);
      }
    }
  }

  console.log(message);
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
  const lastExitAttemptRef = useRef(0);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  useEffect(() => {
    locationRef.current = location;
    lastExitAttemptRef.current = 0;
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
          const currentRouteKey = buildRouteKey(currentLocation);
          const currentStack = stackRef.current || [];
          const historyIndex =
            typeof window !== "undefined" ? window.history.state?.idx ?? 0 : 0;
          const canGoBack = currentStack.length > 1 || historyIndex > 0;

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

          if (currentPath === HOME_PATH) {
            const now = Date.now();
            const elapsed = now - lastExitAttemptRef.current;
            if (elapsed < 2000) {
              if (debugEnabledRef.current) {
                console.debug("[android-back] exit app", {
                  route: currentPath,
                  stackLength: currentStack.length,
                  action: "exit-app",
                });
              }
              App.exitApp();
              return;
            }

            lastExitAttemptRef.current = now;
            showExitPrompt("Appuyez à nouveau pour quitter");
            if (debugEnabledRef.current) {
              console.debug("[android-back] exit prompt", {
                route: currentPath,
                stackLength: currentStack.length,
                action: "exit-prompt",
              });
            }
            return;
          }

          if (canGoBack) {
            if (debugEnabledRef.current) {
              console.debug("[android-back] navigate back", {
                route: currentPath,
                stackLength: currentStack.length,
                historyIndex,
                action: "navigate-back",
              });
            }
            navigateRef.current(-1);
            setTimeout(() => {
              const nextRouteKey = buildRouteKey(locationRef.current);
              if (nextRouteKey === currentRouteKey) {
                const fallbackTarget =
                  currentStack[currentStack.length - 2] || HOME_PATH;
                if (debugEnabledRef.current) {
                  console.debug("[android-back] fallback navigate", {
                    route: currentPath,
                    stackLength: currentStack.length,
                    action: "fallback",
                    target: fallbackTarget,
                  });
                }
                navigateRef.current(fallbackTarget);
              }
            }, 80);
            return;
          }

          if (DASHBOARD_PATHS.includes(currentPath)) {
            if (debugEnabledRef.current) {
              console.debug("[android-back] dashboard to home", {
                route: currentPath,
                stackLength: currentStack.length,
                home: HOME_PATH,
                action: "dashboard-home",
              });
            }
            navigateRef.current(HOME_PATH);
            return;
          }

          if (debugEnabledRef.current) {
            console.debug("[android-back] go home", {
              route: currentPath,
              stackLength: currentStack.length,
              home: HOME_PATH,
              action: "home",
            });
          }

          navigateRef.current(HOME_PATH);
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

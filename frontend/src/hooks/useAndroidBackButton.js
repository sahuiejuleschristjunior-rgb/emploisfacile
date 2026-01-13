import { useEffect } from "react";
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

export default function useAndroidBackButton(options = {}) {
  const { rootPaths = DEFAULT_ROOT_PATHS } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

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
          if (!isRootPath(pathname, rootPaths)) {
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
  }, [navigate, pathname, rootPaths]);
}

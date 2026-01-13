import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
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
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!isAndroidNative()) {
      return undefined;
    }

    const handler = App.addListener("backButton", () => {
      const { pathname } = locationRef.current;

      if (!isRootPath(pathname, rootPaths)) {
        navigate(-1);
        return;
      }

      App.exitApp();
    });

    return () => {
      handler.remove();
    };
  }, [navigate, rootPaths]);
}

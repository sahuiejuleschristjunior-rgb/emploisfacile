import { Capacitor } from "@capacitor/core";

let statusBarInitialized = false;

export async function initStatusBar() {
  if (statusBarInitialized) return;
  statusBarInitialized = true;

  if (!Capacitor.isNativePlatform()) return;

  try {
    const statusBar = Capacitor.Plugins?.StatusBar;
    if (!statusBar) return;
    await statusBar.setOverlaysWebView({ overlay: false });
    await statusBar.setStyle({ style: "DARK" });
    await statusBar.setBackgroundColor({ color: "#0b0b0b" });
  } catch (error) {
    console.warn("[status-bar] init failed", error);
  }
}

export function registerStatusBarListeners() {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    const app = Capacitor.Plugins?.App;
    const statusBar = Capacitor.Plugins?.StatusBar;
    if (!app || !statusBar) return () => {};

    const handler = app.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      statusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    });

    return () => {
      handler.remove();
    };
  } catch (error) {
    console.warn("[status-bar] listener failed", error);
    return () => {};
  }
}

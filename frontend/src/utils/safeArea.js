const DEBUG_STORAGE_KEY = "safe-area-debug";

export function isSafeAreaDebugEnabled() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("insets") === "1" ||
    params.has("safeAreaDebug") ||
    window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1"
  );
}

export function getSafeAreaValues() {
  const styles = getComputedStyle(document.documentElement);
  return {
    sat: styles.getPropertyValue("--sat").trim(),
    sab: styles.getPropertyValue("--sab").trim(),
    sal: styles.getPropertyValue("--sal").trim(),
    sar: styles.getPropertyValue("--sar").trim(),
  };
}

export function initSafeAreaDebug() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const debugEnabled = isSafeAreaDebugEnabled();
  let debugEl = null;

  const update = () => {
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const width = viewport?.width ?? window.innerWidth;

    root.style.setProperty("--vvh", `${height}px`);
    root.style.setProperty("--vvw", `${width}px`);
    root.style.setProperty("--app-height", `${height}px`);

    if (!debugEnabled) return;

    if (!debugEl) {
      debugEl = document.createElement("div");
      debugEl.className = "safe-area-debug";
      document.body.appendChild(debugEl);
    }

    const safeArea = getSafeAreaValues();
    debugEl.textContent = [
      `safe-area-top: ${safeArea.sat}`,
      `safe-area-bottom: ${safeArea.sab}`,
      `safe-area-left: ${safeArea.sal}`,
      `safe-area-right: ${safeArea.sar}`,
      `innerHeight: ${window.innerHeight}px`,
      `visualViewport.height: ${viewport?.height ?? "n/a"}px`,
      `innerWidth: ${window.innerWidth}px`,
      `visualViewport.width: ${viewport?.width ?? "n/a"}px`,
    ].join("\n");

    console.debug("[safe-area]", {
      safeArea,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      visualViewport: {
        height: viewport?.height ?? null,
        width: viewport?.width ?? null,
        offsetTop: viewport?.offsetTop ?? null,
      },
    });
  };

  update();
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
}

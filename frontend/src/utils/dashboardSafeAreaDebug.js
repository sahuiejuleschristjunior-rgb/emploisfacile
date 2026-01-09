import { useEffect } from "react";
import { getSafeAreaValues } from "./safeArea";

const DEBUG_CLASS = "dashboard-safe-area-debug";

const STYLE_OVERRIDES = {
  position: "fixed",
  top: "0",
  right: "0",
  zIndex: "99999",
  background: "rgba(0, 0, 0, 0.75)",
  color: "#9ef7a8",
  padding: "8px 10px",
  fontSize: "12px",
  fontFamily:
    "ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
  whiteSpace: "pre-wrap",
  pointerEvents: "none",
};

const riskyOverflow = (value) => value && value !== "visible" && value !== "clip";

const collectParentIssues = (node) => {
  if (!node) return [];
  const issues = [];
  let current = node.parentElement;

  while (current) {
    const styles = window.getComputedStyle(current);
    const currentIssues = {};

    if (styles.transform && styles.transform !== "none") {
      currentIssues.transform = styles.transform;
    }
    if (styles.filter && styles.filter !== "none") {
      currentIssues.filter = styles.filter;
    }
    if (styles.backdropFilter && styles.backdropFilter !== "none") {
      currentIssues.backdropFilter = styles.backdropFilter;
    }
    if (styles.perspective && styles.perspective !== "none") {
      currentIssues.perspective = styles.perspective;
    }
    if (styles.contain && styles.contain !== "none") {
      currentIssues.contain = styles.contain;
    }
    if (styles.willChange && styles.willChange !== "auto") {
      currentIssues.willChange = styles.willChange;
    }
    if (riskyOverflow(styles.overflow)) {
      currentIssues.overflow = styles.overflow;
    }
    if (riskyOverflow(styles.overflowX)) {
      currentIssues.overflowX = styles.overflowX;
    }
    if (riskyOverflow(styles.overflowY)) {
      currentIssues.overflowY = styles.overflowY;
    }

    if (Object.keys(currentIssues).length > 0) {
      issues.push({ element: current, issues: currentIssues });
    }

    current = current.parentElement;
  }

  return issues;
};

export default function useDashboardSafeAreaDebug(label = "dashboard") {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const existing = document.querySelector(`.${DEBUG_CLASS}`);
    if (existing) {
      existing.remove();
    }

    const debugEl = document.createElement("div");
    debugEl.className = DEBUG_CLASS;
    Object.assign(debugEl.style, STYLE_OVERRIDES);
    document.body.appendChild(debugEl);

    const update = () => {
      const safeArea = getSafeAreaValues();
      const header = document.querySelector(".fb-header");
      const bottomNav = document.querySelector(".fb-bottom-nav");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const bottomHeight = bottomNav?.getBoundingClientRect().height ?? 0;

      debugEl.textContent = [
        `safe-area-top: ${safeArea.sat}`,
        `safe-area-bottom: ${safeArea.sab}`,
        `header-height: ${Math.round(headerHeight)}px`,
        `bottom-nav-height: ${Math.round(bottomHeight)}px`,
        `label: ${label}`,
      ].join("\n");
    };

    const logParentIssues = (name, node) => {
      const issues = collectParentIssues(node);
      if (issues.length === 0) return;

      console.debug(`[dashboard-safe-area] parent issues for ${name}`, issues);
    };

    const headerNode = document.querySelector(".fb-header");
    const bottomNode = document.querySelector(".fb-bottom-nav");
    logParentIssues("header", headerNode);
    logParentIssues("bottom-nav", bottomNode);

    update();
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      debugEl.remove();
    };
  }, [label]);
}

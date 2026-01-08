import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import JobFeed from "../components/JobFeed";
import EmploisMobile from "./EmploisMobile";
import AppShell from "../layouts/AppShell";

const MOBILE_BREAKPOINT = 768;

export default function EmploisPage() {
  const outletContext = useOutletContext() || {};
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
      : window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handleChange = (event) => setIsMobile(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.addEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  if (isMobile) {
    return <EmploisMobile />;
  }

  return (
    <AppShell className="emplois-shell">
      <JobFeed {...outletContext} />
    </AppShell>
  );
}

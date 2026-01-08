import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import JobFeed from "../components/JobFeed";
import EmploisMobile from "./EmploisMobile";

export default function EmploisPage() {
  const outletContext = useOutletContext() || {};
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => setIsMobile(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  if (isMobile) {
    return <EmploisMobile />;
  }

  return <JobFeed {...outletContext} />;
}

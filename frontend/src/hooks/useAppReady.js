import { useEffect, useState } from "react";

export default function useAppReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const token = localStorage.getItem("token");

        // Si pas connecté → pas de splash bloquant
        if (!token) {
          setReady(true);
          return;
        }

        // Pause UX volontaire (splash visible)
        await new Promise((r) => setTimeout(r, 600));
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { isNavigationDebugEnabled } from "./constants";

const NavigationStackContext = createContext({
  stack: [],
  setOverlayCloseHandler: () => {},
  overlayCloseHandler: null,
});

const buildRouteKey = (location) =>
  `${location.pathname}${location.search}${location.hash}`;

const computeNextStack = ({
  currentStack,
  routeKey,
  navigationType,
}) => {
  const lastEntry = currentStack[currentStack.length - 1];

  if (routeKey === lastEntry) {
    return currentStack;
  }

  if (navigationType === "POP") {
    const popped = currentStack.length > 1
      ? currentStack.slice(0, -1)
      : currentStack;
    const lastAfterPop = popped[popped.length - 1];

    if (lastAfterPop === routeKey) {
      return popped;
    }

    return [...popped, routeKey];
  }

  if (navigationType === "REPLACE") {
    const base = currentStack.length > 0
      ? currentStack.slice(0, -1)
      : [];
    return [...base, routeKey];
  }

  return [...currentStack, routeKey];
};

export function NavigationStackProvider({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [stack, setStack] = useState(() => [buildRouteKey(location)]);
  const [overlayCloseHandler, setOverlayCloseHandler] = useState(null);
  const debugEnabledRef = useRef(isNavigationDebugEnabled());

  const routeKey = useMemo(
    () => buildRouteKey(location),
    [location.pathname, location.search, location.hash]
  );

  useEffect(() => {
    setStack((prev) => {
      const next = computeNextStack({
        currentStack: prev,
        routeKey,
        navigationType,
      });

      if (debugEnabledRef.current) {
        if (routeKey === prev[prev.length - 1]) {
          console.debug("[nav-stack] duplicate route ignored", {
            type: navigationType,
            route: routeKey,
            stack: next,
          });
        } else {
          console.debug("[nav-stack] navigation", {
            type: navigationType,
            route: routeKey,
            stack: next,
          });
        }
      }

      return next;
    });
  }, [routeKey, navigationType]);

  const value = useMemo(
    () => ({
      stack,
      overlayCloseHandler,
      setOverlayCloseHandler,
    }),
    [stack, overlayCloseHandler]
  );

  return (
    <NavigationStackContext.Provider value={value}>
      {children}
    </NavigationStackContext.Provider>
  );
}

export function useNavigationStack() {
  return useContext(NavigationStackContext);
}

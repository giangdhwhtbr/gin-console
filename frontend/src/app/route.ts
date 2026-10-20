import { useEffect, useState } from "react";

type Location = { pathname: string; search: string };

const current = (): Location => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

export function navigate(to: string, options?: { replace?: boolean }): void {
  if (options?.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useLocation(): Location {
  const [location, setLocation] = useState(current);
  useEffect(() => {
    const update = () => setLocation(current());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return location;
}

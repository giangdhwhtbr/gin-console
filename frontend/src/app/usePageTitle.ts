import { useEffect } from "react";

const BASE = "gin-console";

/** REQ-UI-063: the title names what the page shows, then its project; `null` while the name loads. */
export function usePageTitle(name: string | null, project?: string | null): void {
  const title = name === null ? BASE : [name, project, BASE].filter((part): part is string => Boolean(part)).join(" · ");
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = BASE;
    };
  }, [title]);
}

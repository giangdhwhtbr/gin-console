import { useEffect } from "react";
import { NotFoundPage } from "@/app/NotFoundPage";
import { navigate, useLocation } from "@/app/route";
import { fixedSearch } from "./filters";
import { ReportsView } from "./ReportsView";
import { legacyTarget, sectionOf } from "./sections";

/**
 * REQ-UI-095: the Reports page at `/reports/<section>`. `/reports`, an old `tab` link and an old scope (REQ-REPORTS-033) are
 * replaced without a history entry; a path naming no section is not a page (REQ-UI-125).
 */
export function ReportsPage() {
  const { pathname, search } = useLocation();
  const section = sectionOf(pathname);
  const fixed = fixedSearch(search);
  const target = legacyTarget(pathname, search) ?? (fixed === null ? null : `${pathname}${fixed}`);
  useEffect(() => {
    if (target !== null) navigate(target, { replace: true });
  }, [target]);
  if (target !== null || section === "index") return null;
  if (section === "unknown") return <NotFoundPage path={pathname} />;
  return <ReportsView section={section} />;
}

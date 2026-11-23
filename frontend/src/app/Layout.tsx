import { ChartColumn, Flag, ListChecks, LogOut, PanelLeftClose, PanelLeftOpen, TriangleAlert, UserCheck } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { useSections } from "@/features/reports/sectionStore";
import { cn } from "@/lib/utils";
import { clearEmail, useEmail } from "./identity";
import { Link } from "./Link";
import { originFor, useOrigin, type Origin, type OriginKind } from "./origin";
import { forgetConfiguredProjects, projectHref, resolveProject, useConfiguredProjects } from "./project";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { useLocation } from "./route";
import { RefreshButton } from "./RefreshButton";
import { ICON_BUTTON, ThemeToggle } from "./ThemeToggle";

/** The page a bead page was opened from (REQ-UI-073), when it is not the Beads page; null on other pages. */
function beadOrigin(pathname: string, origin: Origin): OriginKind | null {
  const match = /^\/beads\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  try {
    const kind = originFor(decodeURIComponent(match[1]), origin)?.kind ?? null;
    return kind === "beads" ? null : kind;
  } catch {
    return null; // an address that does not decode
  }
}

type Place = { path: string; from: OriginKind | null };
const NAV = [
  { to: (project: string) => projectHref("/beads", project), label: "Beads", icon: ListChecks, current: ({ path, from }: Place) => path === "/beads" || (path.startsWith("/beads/") && from === null) },
  { to: (project: string) => projectHref("/my-tasks", project), label: "My Tasks", icon: UserCheck, current: ({ path, from }: Place) => path === "/my-tasks" || from === "my-tasks" },
  { to: (project: string) => projectHref("/milestones", project), label: "Milestones", icon: Flag, current: ({ path, from }: Place) => path === "/milestones" || path.startsWith("/milestones/") || from === "milestone" },
  { to: (project: string) => projectHref("/reports", project), label: "Reports", icon: ChartColumn, current: ({ path, from }: Place) => path === "/reports" || from === "reports" },
] as const;

const LINK = cn(
  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground",
  "aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_2px_0_0_var(--identity)] aria-[current=page]:[&_svg]:text-identity",
  "md:min-h-14 md:flex-none md:rounded-lg md:hover:bg-muted md:aria-[current=page]:bg-muted md:aria-[current=page]:shadow-[inset_3px_0_0_var(--identity)]",
);
/** The sidebar look of a link from 1024px, left out while the sidebar is collapsed. */
const LINK_WIDE = "lg:min-h-10 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm";

export const SIDEBAR_KEY = "gin-console-sidebar";

function storedCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    return false; // storage refused: start expanded
  }
}

/** Three beads on a thread, in the status colours: the only brand mark. */
function Brand({ wordClass }: { wordClass?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
        <path d="M5 6h20" className="stroke-identity" strokeWidth="2" />
        <circle cx="5" cy="6" r="4.5" className="fill-state-done" />
        <circle cx="15" cy="6" r="4.5" className="fill-state-progress" />
        <circle cx="25" cy="6" r="3.5" className="fill-card stroke-state-ready" strokeWidth="2" />
      </svg>
      <span className={cn("whitespace-nowrap text-sm font-semibold", wordClass)}>gin-console</span>
    </span>
  );
}

export function Layout({ children, onRefreshed }: { children: ReactNode; onRefreshed: () => void }) {
  const { pathname, search } = useLocation();
  const projects = useConfiguredProjects();
  const place: Place = { path: pathname, from: beadOrigin(pathname, useOrigin()) };
  const project = resolveProject(new URLSearchParams(search).get("project") ?? "", projects.status === "ok" ? projects.names : []);
  const refreshed = () => {
    forgetConfiguredProjects();
    onRefreshed();
  };
  const [collapsed, setCollapsed] = useState(storedCollapsed);
  const wide = !collapsed;
  const email = useEmail();
  const toggle = () => {
    setCollapsed(wide);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, wide ? "collapsed" : "expanded");
    } catch {
      // storage refused: the choice lasts for this visit only
    }
  };
  const { sections, selected } = useSections();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <div data-sidebar={wide ? "expanded" : "collapsed"} className="group/shell flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:border focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground"
      >
        Skip to content
      </a>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card pl-4 pr-1 md:hidden">
        <Brand wordClass="max-sm:sr-only" />
        <ProjectSwitcher variant="bar" />
        <div className="flex shrink-0">
          <RefreshButton onRefreshed={refreshed} />
          <ThemeToggle />
          {email !== null && (
            <button
              type="button"
              onClick={clearEmail}
              aria-label={`Log out ${email}`}
              title={`Log out ${email}`}
              className={ICON_BUTTON}
            >
              <LogOut aria-hidden className="size-5" />
            </button>
          )}
        </div>
      </header>
      <div
        className={cn(
          "md:flex md:min-h-screen md:w-20 md:shrink-0 md:flex-col md:gap-4 md:border-r md:bg-card md:px-2 md:py-4",
          wide && "lg:w-64 lg:px-3",
        )}
      >
        <div className={cn("hidden items-center gap-2 md:flex md:flex-col", wide && "lg:flex-row lg:justify-between lg:gap-1 lg:pl-2")}>
          <Brand wordClass={wide ? "max-lg:hidden" : "hidden"} />
          <div className={cn("flex flex-col", wide && "lg:flex-row")}>
            <RefreshButton onRefreshed={refreshed} />
            <ThemeToggle />
            <button
              type="button"
              onClick={toggle}
              aria-expanded={wide}
              aria-label={wide ? "Collapse sidebar" : "Expand sidebar"}
              title={wide ? "Collapse sidebar" : "Expand sidebar"}
              className={cn(ICON_BUTTON, "hidden lg:flex")}
            >
              <ToggleIcon aria-hidden className="size-5" />
            </button>
          </div>
        </div>
        <div className={cn("hidden md:flex md:justify-center", wide && "lg:justify-stretch")}>
          {wide && (
            <div className="hidden w-full lg:block">
              <ProjectSwitcher variant="sidebar" />
            </div>
          )}
          <div className={cn(wide && "lg:hidden")}>
            <ProjectSwitcher variant="rail" />
          </div>
        </div>
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-1 md:border-t-0 md:pb-0"
        >
          {NAV.map(({ to, label, icon: Icon, current }) => (
            <Fragment key={label}>
              <Link to={to(project)} aria-current={current(place) ? "page" : undefined} className={cn(LINK, wide && LINK_WIDE)}>
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
              {label === "Reports" && wide && pathname === "/reports" && sections.length > 0 && (
                <ul aria-label="Report sections" className="ml-4 hidden flex-col gap-0.5 border-l pl-2 lg:flex">
                  {sections.map((section) => (
                    <li key={section.tab}>
                      <Link
                        to={section.href}
                        aria-current={section.tab === selected ? "page" : undefined}
                        className="flex flex-col rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
                      >
                        {section.label}
                        {section.headline !== "" && " "}
                        {section.headline !== "" && (
                          <span className={cn("inline-flex items-center gap-1 text-xs font-normal", section.warn && "text-state-blocked")}>
                            {section.warn && <TriangleAlert aria-hidden className="size-3.5" />}
                            {section.headline}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Fragment>
          ))}
        </nav>
        {email !== null && (
          <div
            className={cn(
              "hidden md:mt-auto md:flex md:flex-col md:items-center md:gap-1 md:border-t md:pt-3",
              wide && "lg:flex-row lg:justify-between lg:px-2",
            )}
          >
            <span
              aria-hidden
              title={email}
              className={cn(
                "flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold",
                wide && "lg:hidden",
              )}
            >
              {email[0]?.toUpperCase()}
            </span>
            <span className={cn("hidden truncate text-sm", wide && "lg:block")}>{email}</span>
            <button
              type="button"
              onClick={clearEmail}
              aria-label={`Log out ${email}`}
              title={`Log out ${email}`}
              className={ICON_BUTTON}
            >
              <LogOut aria-hidden className="size-5" />
            </button>
          </div>
        )}
      </div>
      <main id="main" tabIndex={-1} className="min-w-0 outline-none flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6">{children}</main>
    </div>
  );
}

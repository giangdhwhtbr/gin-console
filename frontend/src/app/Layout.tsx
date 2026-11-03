import { ChartColumn, Flag, Gauge, LayoutGrid, ListChecks, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "./Link";
import { useLocation } from "./route";
import { ICON_BUTTON, ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/", label: "Projects", icon: LayoutGrid, current: (path: string) => path === "/" },
  { to: "/beads", label: "Beads", icon: ListChecks, current: (path: string) => path === "/beads" || path.startsWith("/beads/") },
  { to: "/milestones", label: "Milestones", icon: Flag, current: (path: string) => path === "/milestones" || path.startsWith("/milestones/") },
  { to: "/reports", label: "Reports", icon: ChartColumn, current: (path: string) => path === "/reports" },
  { to: "/quota", label: "Quota", icon: Gauge, current: (path: string) => path === "/quota" },
] as const;

const LINK = cn(
  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
  "aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_2px_0_0_var(--foreground)]",
  "md:min-h-14 md:flex-none md:rounded-lg md:hover:bg-muted md:aria-[current=page]:bg-muted md:aria-[current=page]:shadow-none",
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
    <span className="flex items-center gap-2.5">
      <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
        <path d="M5 6h20" className="stroke-border" strokeWidth="2" />
        <circle cx="5" cy="6" r="4.5" className="fill-state-ready" />
        <circle cx="15" cy="6" r="4.5" className="fill-state-progress" />
        <circle cx="25" cy="6" r="4.5" className="fill-state-blocked" />
      </svg>
      <span className={cn("whitespace-nowrap text-sm font-semibold", wordClass)}>gin-console</span>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(storedCollapsed);
  const wide = !collapsed;
  const toggle = () => {
    setCollapsed(wide);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, wide ? "collapsed" : "expanded");
    } catch {
      // storage refused: the choice lasts for this visit only
    }
  };
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card pl-4 pr-1 md:hidden">
        <Brand />
        <ThemeToggle />
      </header>
      <div
        className={cn(
          "md:flex md:w-20 md:shrink-0 md:flex-col md:gap-4 md:border-r md:bg-card md:px-2 md:py-4",
          wide && "lg:w-56 lg:px-3",
        )}
      >
        <div className={cn("hidden items-center gap-2 md:flex md:flex-col", wide && "lg:flex-row lg:justify-between lg:gap-1 lg:pl-2")}>
          <Brand wordClass={wide ? "max-lg:hidden" : "hidden"} />
          <div className="flex">
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
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-1 md:border-t-0 md:pb-0"
        >
          {NAV.map(({ to, label, icon: Icon, current }) => (
            <Link key={to} to={to} aria-current={current(pathname) ? "page" : undefined} className={cn(LINK, wide && LINK_WIDE)}>
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="min-w-0 flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6">{children}</main>
    </div>
  );
}

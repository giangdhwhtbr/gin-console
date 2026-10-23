import { Gauge, LayoutGrid, ListChecks, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "./Link";
import { useLocation } from "./route";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { to: "/", label: "Projects", icon: LayoutGrid, current: (path: string) => path === "/" },
  { to: "/beads", label: "Beads", icon: ListChecks, current: (path: string) => path.startsWith("/beads") },
  { to: "/sessions", label: "Sessions", icon: MessageSquare, current: (path: string) => path.startsWith("/sessions") },
  { to: "/quota", label: "Quota", icon: Gauge, current: (path: string) => path === "/quota" },
] as const;

const LINK = cn(
  "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
  "aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_2px_0_0_var(--foreground)]",
  "md:min-h-14 md:flex-none md:rounded-lg md:hover:bg-muted md:aria-[current=page]:bg-muted md:aria-[current=page]:shadow-none",
  "lg:min-h-10 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm",
);

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
      <span className={cn("text-sm font-semibold", wordClass)}>gin-console</span>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card pl-4 pr-1 md:hidden">
        <Brand />
        <ThemeToggle />
      </header>
      <aside className="md:flex md:w-20 md:shrink-0 md:flex-col md:gap-4 md:border-r md:bg-card md:px-2 md:py-4 lg:w-56 lg:px-3">
        <div className="hidden justify-center px-2 py-1 md:flex lg:justify-start">
          <Brand wordClass="max-lg:hidden" />
        </div>
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-1 md:border-t-0 md:pb-0"
        >
          {NAV.map(({ to, label, icon: Icon, current }) => (
            <Link key={to} to={to} aria-current={current(pathname) ? "page" : undefined} className={LINK}>
              <Icon aria-hidden className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle className="hidden md:mt-auto md:flex" />
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6">{children}</main>
    </div>
  );
}

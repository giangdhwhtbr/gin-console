import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "./Link";
import { useLocation } from "./route";

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-52 shrink-0 border-r p-4">
        <div className="mb-6 font-semibold">gin-console</div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            to="/"
            className={cn("rounded px-2 py-1", pathname === "/" && "bg-muted font-medium")}
          >
            Projects
          </Link>
          <Link
            to="/sessions"
            className={cn(
              "rounded px-2 py-1",
              pathname.startsWith("/sessions") && "bg-muted font-medium",
            )}
          >
            Sessions
          </Link>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}

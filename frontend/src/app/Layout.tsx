import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-52 shrink-0 border-r p-4">
        <div className="mb-6 font-semibold">gin-console</div>
        <nav className="flex flex-col gap-1 text-sm">
          <a href="/" className="rounded bg-muted px-2 py-1 font-medium">
            Projects
          </a>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}

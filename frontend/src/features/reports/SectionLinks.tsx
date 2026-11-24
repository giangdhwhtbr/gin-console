import { TriangleAlert } from "lucide-react";
import { Link } from "@/app/Link";
import { cn } from "@/lib/utils";
import type { SectionLink } from "./sectionStore";

const LINK = cn(
  "flex min-h-11 shrink-0 flex-col items-start justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground md:min-h-9",
  "aria-[current=page]:border-identity aria-[current=page]:text-foreground",
);

/** REQ-UI-095: the report sections as a row of links, each with its headline under its name; `current` marks the shown one. */
export function SectionLinks({ links, current }: { links: readonly SectionLink[]; current: SectionLink["section"] }) {
  return (
    <nav aria-label="Report sections" className="flex gap-2 overflow-x-auto border-b">
      {links.map((link) => (
        <Link key={link.section} to={link.href} aria-current={link.section === current ? "page" : undefined} className={LINK}>
          <span>{link.label}</span>
          {link.headline !== "" && " "}
          {link.headline !== "" && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-normal text-muted-foreground", link.warn && "text-state-blocked")}>
              {link.warn && <TriangleAlert aria-hidden className="size-3.5" />}
              {link.headline}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

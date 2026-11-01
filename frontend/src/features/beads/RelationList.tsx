import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Relation } from "./api";

export function RelationList({
  title,
  titleClassName,
  project,
  items,
}: {
  title: string;
  titleClassName?: string;
  project: string;
  items: Relation[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className={cn("font-medium", titleClassName)}>{title}</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(item.id)}`}>
              <span className="font-mono">{item.id}</span>
            </Link>
            <span>{item.title}</span>
            <Badge variant="secondary">{item.status}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

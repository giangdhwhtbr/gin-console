import { Link } from "@/app/Link";
import { shortId } from "@/lib/shortId";
import { cn } from "@/lib/utils";
import type { Relation } from "./api";
import { gateWords } from "./mergeGates";
import { PrepChip } from "./PrepChip";

/** REQ-UI-028: a relation's status as a word ("In progress"), never the raw value (`in_progress`). */
const statusLabel = (status: string): string => {
  const words = status.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function RelationList({
  title,
  titleClassName,
  project,
  items,
}: {
  title: string;
  titleClassName?: string;
  project: string;
  items: (Relation & { prep?: boolean })[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className={cn("font-medium", titleClassName)}>{title}</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(item.id)}`}>
              <span className="font-mono" title={item.id} aria-hidden={shortId(item.id) !== item.id || undefined}>
                {shortId(item.id)}
              </span>
              {shortId(item.id) !== item.id && <span className="sr-only">{item.id}</span>}
            </Link>
            {item.waits_for != null ? (
              <span className="min-w-0 wrap-anywhere">
                {`Waits for ${gateWords(item.waits_for)} · ${item.status === "closed" ? "merged" : "merge pending"}`}
              </span>
            ) : (
              <>
                <span className="min-w-0 wrap-anywhere">{item.title}</span>
                {item.prep === true && <PrepChip />}
                <span className="text-xs text-muted-foreground">{statusLabel(item.status)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

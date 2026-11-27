import { Check, CircleHelp, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "@/app/Link";
import { cn } from "@/lib/utils";
import { caseHref, fetchReadiness, useFetched, type ItemState, type Readiness, type ReadinessItem } from "@/features/qa/api";
import { QaError } from "@/features/qa/QaError";
import { sectionHref } from "@/features/requirements/paths";

const VERDICT = { ready: "Ready", not_ready: "Not ready", unknown: "Unknown" } as const;
// REQ-QA-012: each mark is an icon and its word, so the state is not told by colour alone
const MARK = {
  pass: { word: "Pass", Icon: Check, tone: "text-state-done" },
  fail: { word: "Fail", Icon: X, tone: "text-state-blocked" },
  unknown: { word: "Unknown", Icon: CircleHelp, tone: "text-muted-foreground" },
} as const satisfies Record<ItemState, { word: string; Icon: typeof Check; tone: string }>;

const beadHref = (project: string, id: string) => `/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`;
const count = (item: ReadinessItem) => ({ cases: item.requirements, results: item.cases, bugs: item.bugs, gates: item.epics })[item.key].length;

function ItemList({ project, item }: { project: string; item: ReadinessItem }) {
  const link = "prose-link font-mono";
  return (
    <ul className="flex flex-col gap-1 pl-5 text-sm">
      {item.key === "cases" &&
        item.requirements.map((r) => (
          <li key={r.id} className="flex flex-wrap gap-x-2">
            <Link to={sectionHref("matrix", project, { req: r.id })} className={link}>{r.id}</Link>
            <span>{r.title}</span>
            <span className="text-muted-foreground">{r.capability}</span>
          </li>
        ))}
      {item.key === "results" &&
        item.cases.map((c) => (
          <li key={c.id} className="flex flex-wrap gap-x-2">
            <Link to={caseHref(project, c.id)} className={link}>{c.id}</Link>
            <span>{c.title}</span>
            <span className="text-muted-foreground">{c.effective_result}</span>
            {c.bug !== null && <Link to={beadHref(project, c.bug)} className={link}>{c.bug}</Link>}
          </li>
        ))}
      {item.key === "bugs" &&
        item.bugs.map((b) => (
          <li key={b.id} className="flex flex-wrap gap-x-2">
            <Link to={beadHref(project, b.id)} className={link}>{b.id}</Link>
            <span>{b.title}</span>
            <span className="text-muted-foreground">{`P${b.priority}`}</span>
            {b.epic === null ? (
              <span className="text-muted-foreground">Unknown source</span>
            ) : (
              <Link to={beadHref(project, b.epic.id)} className={link}>{b.epic.id}</Link>
            )}
          </li>
        ))}
      {item.key === "gates" &&
        item.epics.map((e) => (
          <li key={e.id} className="flex flex-wrap gap-x-2">
            <Link to={beadHref(project, e.id)} className={link}>{e.id}</Link>
            <span>{e.title}</span>
            <span className="text-muted-foreground">{`waiting on ${e.gate}`}</span>
          </li>
        ))}
    </ul>
  );
}

function Item({ project, item }: { project: string; item: ReadinessItem }) {
  const [open, setOpen] = useState(false);
  const { word, Icon, tone } = MARK[item.state];
  const listId = `readiness-${item.key}`;
  const total = count(item);
  return (
    <section aria-labelledby={`${listId}-title`} className="flex flex-col gap-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={`${listId}-title`} className="text-base font-semibold">{item.title}</h2>
        <span className={cn("inline-flex items-center gap-1 text-sm font-medium", tone)}>
          <Icon aria-hidden className="size-4" />
          {word}
        </span>
        <span className="text-sm text-muted-foreground">{total}</span>
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} className="text-sm hover:text-identity">
          {open ? "Hide list" : "Show list"}
        </button>
      </div>
      {item.note !== null && <p className="text-sm text-muted-foreground">{item.note}</p>}
      {item.error !== null && <p className="text-sm text-destructive">{item.error}</p>}
      <div id={listId} hidden={!open}>
        {open && (total === 0 ? <p className="pl-5 text-sm text-muted-foreground">Nothing listed</p> : <ItemList project={project} item={item} />)}
      </div>
    </section>
  );
}

function Checklist({ project, readiness }: { project: string; readiness: Readiness }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{VERDICT[readiness.verdict]}</h2>
      {readiness.items.map((item) => (
        <Item key={item.key} project={project} item={item} />
      ))}
    </div>
  );
}

/** REQ-QA-012: the readiness checklist of a milestone. */
export function ReadinessTab({ project, milestoneId }: { project: string; milestoneId: string }) {
  const fetcher = useCallback(() => fetchReadiness(project, milestoneId), [project, milestoneId]);
  const { state, retry } = useFetched(fetcher);
  if (state.status === "loading") return <p className="text-muted-foreground">Loading readiness…</p>;
  if (state.status === "error") return <QaError failure={state.failure} onRetry={retry} />;
  return <Checklist project={project} readiness={state.data} />;
}

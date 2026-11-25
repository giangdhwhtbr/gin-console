import { useCallback } from "react";
import { Link } from "@/app/Link";
import { useLocation } from "@/app/route";
import { MarkdownView } from "@/features/beads/MarkdownView";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fetchChange, type ChangeContent, type ChangeRow } from "./api";
import { signoffText } from "./labels";
import { sectionHref } from "./paths";
import { RequirementsError } from "./RequirementsError";
import { useFetched } from "./useFetched";

const TABS = [
  { key: "proposal", label: "Proposal" },
  { key: "spec-delta", label: "Spec delta" },
  { key: "design", label: "Design" },
  { key: "plan", label: "Plan" },
  { key: "tests", label: "Tests" },
];

function Body({ project, data, row }: { project: string; data: ChangeContent; row: ChangeRow | null }) {
  const { pathname, search } = useLocation();
  const tabs = TABS.filter((t) => t.key in data.files);
  const asked = new URLSearchParams(search).get("tab");
  const current = tabs.find((t) => t.key === asked) ?? tabs[0];
  const hrefOf = (key: string) => {
    const params = new URLSearchParams(search);
    params.set("tab", key);
    return `${pathname}?${params.toString()}`;
  };
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold [overflow-wrap:anywhere]">{data.title}</h1>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Epic</dt>
            <dd>
              {data.epic === null ? (
                "None"
              ) : (
                <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(data.epic)}`} className="prose-link">
                  {data.epic}
                </Link>
              )}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Archived</dt>
            <dd>{data.archived === null ? "Open" : formatDate(data.archived)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Sign-off</dt>
            <dd>{signoffText(row === null ? null : row.signoff)}</dd>
          </div>
        </dl>
      </header>
      {current === undefined ? (
        <p>This change has no documents yet.</p>
      ) : (
        <>
          <nav aria-label="Change documents" className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Link
                key={t.key}
                to={hrefOf(t.key)}
                aria-current={t === current ? "page" : undefined}
                className={cn("rounded border px-2 py-1 text-sm", t === current && "bg-accent font-medium")}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <MarkdownView text={data.files[current.key] ?? ""} />
        </>
      )}
    </div>
  );
}

/** REQ-REQUIREMENTS-017: one change, read-only; `row` supplies the sign-off from the trace (null: unknown). */
export function ChangePage({ project, folder, row }: { project: string; folder: string; row: ChangeRow | null }) {
  const { state, retry } = useFetched(useCallback(() => fetchChange(project, folder), [project, folder]));
  if (state.status === "loading") return <p className="text-muted-foreground">Loading change</p>;
  if (state.status === "error") {
    if (state.error.status === 404)
      return (
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold [overflow-wrap:anywhere]">{`Change ${folder} was not found`}</h1>
          <Link to={sectionHref("changes", project)} className="prose-link">
            Changes
          </Link>
        </section>
      );
    return <RequirementsError error={state.error} onRetry={retry} />;
  }
  return <Body project={project} data={state.data} row={row} />;
}

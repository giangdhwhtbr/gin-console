import { navigate, useLocation } from "@/app/route";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { RequirementList } from "./api";
import { matching, parseFilters, SIGNOFFS, STATUSES, withFilters, type MatrixFilters } from "./filters";
import { MatrixTable } from "./MatrixTable";
import { RequirementDetails } from "./RequirementDetails";
import { SIGNOFF_LABELS, STATUS_LABELS } from "./labels";
import { RequirementsError } from "./RequirementsError";
import type { Fetched } from "./useFetched";

const SELECT = "min-w-0 max-w-full rounded border bg-background px-2 py-1 text-sm text-foreground";

/** REQ-REQUIREMENTS-013, 014, 015, 019: the matrix with its filters, details and empty or failed states. */
export function MatrixSection({ project, list, retry }: { project: string; list: Fetched<RequirementList>; retry: () => void }) {
  const { search } = useLocation();
  if (list.status === "loading") return <p className="text-muted-foreground">Loading requirements</p>;
  if (list.status === "error") return <RequirementsError error={list.error} onRetry={retry} />;
  const { layout, requirements, warnings } = list.data;
  if (layout === "legacy") return <p>This project uses the legacy layout, which has no requirement ids.</p>;
  if (requirements.length === 0) return <p>This project has no requirements yet.</p>;

  const filters = parseFilters(search);
  const change = (next: MatrixFilters) => navigate(`/requirements/matrix${withFilters(search, next)}`, { replace: true });
  const live = requirements.filter((r) => r.state !== "removed");
  const rows = matching(requirements, filters);
  const capabilities = [...new Set(requirements.map((r) => r.capability))];
  const selected = new URLSearchParams(search).get("req");
  const close = () => {
    const params = new URLSearchParams(search);
    params.delete("req");
    navigate(`/requirements/matrix?${params.toString()}`, { replace: true });
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {warnings.length > 0 && (
        <Alert role="status">
          <AlertDescription>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Button
            key={status}
            variant={filters.status === status ? "default" : "outline"}
            size="sm"
            aria-pressed={filters.status === status}
            onClick={() => change({ ...filters, status: filters.status === status ? null : status })}
          >
            {`${STATUS_LABELS[status]} ${live.filter((r) => r.status === status).length}`}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <label className="flex items-center gap-1">
          Status
          <select
            className={SELECT}
            value={filters.status ?? ""}
            onChange={(e) => change({ ...filters, status: STATUSES.find((s) => s === e.target.value) ?? null })}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Capability
          <select className={SELECT} value={filters.capability ?? ""} onChange={(e) => change({ ...filters, capability: e.target.value || null })}>
            <option value="">All</option>
            {capabilities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Sign-off
          <select
            className={SELECT}
            value={filters.signoff ?? ""}
            onChange={(e) => change({ ...filters, signoff: SIGNOFFS.find((s) => s === e.target.value) ?? null })}
          >
            <option value="">All</option>
            {SIGNOFFS.map((s) => (
              <option key={s} value={s}>
                {SIGNOFF_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Search
          <input type="search" className={SELECT} value={filters.q} onChange={(e) => change({ ...filters, q: e.target.value })} placeholder="Id or title" />
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filters.removed} onChange={(e) => change({ ...filters, removed: e.target.checked })} />
          Show removed
        </label>
      </div>
      {selected !== null && selected !== "" && (
        <RequirementDetails key={selected} project={project} id={selected} row={requirements.find((r) => r.id === selected)} onClose={close} />
      )}
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p>No requirements match</p>
          <Button variant="outline" size="sm" onClick={() => change({ status: null, capability: null, signoff: null, q: "", removed: false })}>
            Clear filters
          </Button>
        </div>
      ) : (
        <MatrixTable rows={rows} selected={selected} search={search} />
      )}
    </div>
  );
}

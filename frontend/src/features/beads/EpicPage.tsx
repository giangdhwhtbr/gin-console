import { navigate, useLocation } from "@/app/route";
import { Tabs, type TabItem } from "@/components/Tabs";
import type { BeadDetail } from "./api";
import { BeadBody } from "./BeadBody";
import { BeadHeader } from "./BeadHeader";
import { BeadsView } from "./BeadsView";
import { CommentList } from "./CommentList";
import { EpicOverview } from "./EpicOverview";
import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";
import { hasLanes } from "./lanes";
import { useBeads } from "./useBeads";

export type EpicTab = "overview" | "graph" | "lanes" | "discussion";

const TABS: readonly EpicTab[] = ["overview", "graph", "lanes", "discussion"];
const enc = encodeURIComponent;

/** REQ-UI-119: the URL of an epic page on `tab`, with the filters of the Graph and Lanes tabs; the view, scope, milestone and project are the page's own, so they stay out. */
export function epicPath(project: string, id: string, tab: EpicTab, filters?: BeadFilters): string {
  const own = { ...(filters ?? parseFilters("")), project: "", view: "list" as const, scope: "", milestone: "" };
  const query = [tab === "overview" ? "" : `tab=${tab}`, filtersToSearch(own).slice(1)].filter((part) => part !== "").join("&");
  return `/beads/${enc(project)}/${enc(id)}${query === "" ? "" : `?${query}`}`;
}

/** The page of an epic: its header over the tabs Overview, Graph, Lanes and Discussion (REQ-UI-119). */
export function EpicPage({ project, bead }: { project: string; bead: BeadDetail }) {
  const { search } = useLocation();
  const { state } = useBeads(project, true, true);
  const asked = new URLSearchParams(search).get("tab");
  // `?tab=lanes` stays on Lanes while the beads load or fail (the view shows "Loading beads…" or the error with Retry); only loaded beads without lanes fall back to Overview
  const lanes = state.status === "ok" ? hasLanes(state.beads, bead.id) : asked === "lanes";
  const tab: EpicTab = TABS.find((t) => t === asked && (t !== "lanes" || lanes)) ?? "overview";
  const tabs: readonly TabItem<EpicTab>[] = [
    { value: "overview", label: "Overview" },
    { value: "graph", label: "Graph" },
    ...(lanes ? [{ value: "lanes" as const, label: "Lanes" }] : []),
    { value: "discussion", label: `Discussion (${bead.comment_count})` },
  ];
  const change = (next: BeadFilters) => {
    // a child with children opens its own page; the scope of this one stays the epic
    if (next.scope !== "" && next.scope !== bead.id) navigate(`/beads/${enc(project)}/${enc(next.scope)}`);
    else navigate(epicPath(project, bead.id, tab, next), { replace: true });
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <BeadHeader project={project} bead={bead} />
      <Tabs tabs={tabs} tab={tab} onChange={(next) => navigate(epicPath(project, bead.id, next), { replace: true })} label="Epic views" />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex min-w-0 flex-col gap-4">
        {tab === "overview" && (
          <>
            <EpicOverview project={project} bead={bead} beads={state} lanesHref={epicPath(project, bead.id, "lanes")} />
            <BeadBody project={project} bead={bead} />
          </>
        )}
        {(tab === "graph" || tab === "lanes") && (
          <BeadsView
            project={project}
            filters={{ ...parseFilters(search), project }}
            fixed={{ view: tab, scope: bead.id }}
            onChange={change}
          />
        )}
        {tab === "discussion" &&
          (bead.comment_count === 0 ? <p className="text-muted-foreground">No comments</p> : <CommentList project={project} id={bead.id} />)}
      </div>
    </div>
  );
}

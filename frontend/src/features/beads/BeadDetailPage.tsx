import { useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FactList, type Fact } from "@/components/FactList";
import { PriorityPill } from "@/components/PriorityPill";
import { SizeBadge } from "@/components/SizeBadge";
import { factDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/features/quota/ProgressBar";
import { BeadNotFoundError, fetchBead, type BeadDetail } from "./api";
import { Breadcrumb } from "./Breadcrumb";
import { DetailTabs, type DetailTab } from "./DetailTabs";
import { DiscussionPanel } from "./DiscussionPanel";
import { graphViewPath } from "./graph";
import { KindBadge } from "./KindBadge";
import { LaneChip } from "./LaneChip";
import { leaseOf, trackText, visibleLabels } from "./laneFacts";
import { gateState, gateWords } from "./mergeGates";
import { MarkdownText } from "./MarkdownText";
import { useDiscussionHidden } from "./discussion";
import { RelationList } from "./RelationList";
import { SIDE_PANEL } from "./side-panel";
import { StateMark } from "./StateMark";
import { TextSection } from "./TextSection";
import { complexityOf } from "./complexity";
import { childCounts, prepLabel } from "./prep";
import { TypeBadge } from "./TypeBadge";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ok"; bead: BeadDetail };

export function BeadDetailPage({
  project,
  id,
  embedded = false,
}: {
  project: string;
  id: string;
  embedded?: boolean;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<DetailTab>("details");
  const [hidden, toggleHidden] = useDiscussionHidden();

  useEffect(() => {
    void fetchBead(project, id).then(
      (bead) => setState({ status: "ok", bead }),
      (error: unknown) =>
        setState(
          error instanceof BeadNotFoundError
            ? { status: "notfound" }
            : { status: "error", message: error instanceof Error ? error.message : String(error) },
        ),
    );
  }, [project, id, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };
  const parent = state.status === "ok" ? state.bead.parent : null;
  const back = embedded ? (
    <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`} className="text-sm underline underline-offset-2">
      Open page
    </Link>
  ) : (
    <Breadcrumb project={project} id={id} parent={parent} />
  );

  if (state.status === "notfound") {
    return (
      <section className="flex flex-col gap-4">
        {back}
        <p>Bead not found</p>
      </section>
    );
  }
  const bead = state.status === "ok" ? state.bead : null;
  const complexity = bead?.issue_type === "epic" ? complexityOf(bead.description) : null;
  const gate = bead?.waits_for ?? null;
  const lease = bead === null ? null : leaseOf([bead.claim], new Date());
  const facts: Fact[] =
    bead === null
      ? []
      : [
          { label: "Lane", value: bead.lane },
          { label: "Track", value: bead.track === null ? null : trackText(bead.track) },
          { label: "Lease", value: lease?.text ?? null },
          { label: "Placeholder", value: gate === null ? null : bead.title },
          { label: "Waits for", value: gate === null ? null : `${gate.plan} #${gate.number}` },
          { label: "Owner", value: bead.owner },
          { label: "Assignee", value: bead.assignee },
          { label: "Created by", value: bead.created_by },
          { label: "Created", value: factDate(bead.created_at) },
          { label: "Updated", value: factDate(bead.updated_at) },
          { label: "Comments", value: bead.comment_count },
        ].filter((fact) => fact.value !== null && fact.value !== "");
  const children = bead?.children ?? [];
  const counts = childCounts(children.map((c) => ({ labels: c.prep ? ["prep"] : [], status: c.status, waits_for: c.waits_for })));
  const closed = counts.closedTracks;
  const total = counts.tracks;
  const prep = prepLabel(counts);

  return (
    <section className="flex flex-col gap-4">
      {back}
      {state.status === "loading" && <p className="text-muted-foreground">Loading bead…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>The bead could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {bead !== null && (
        <div
          className={cn(
            bead.comment_count > 0 &&
              !embedded &&
              !hidden &&
              "lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8",
          )}
        >
          <div className="flex min-w-0 flex-col gap-4">
            {bead.comment_count > 0 && (
              <DetailTabs
                tab={tab}
                onChange={setTab}
                count={bead.comment_count}
                className={embedded ? undefined : "lg:hidden"}
              />
            )}
            <div
              role={bead.comment_count > 0 ? "tabpanel" : undefined}
              id={bead.comment_count > 0 ? "panel-details" : undefined}
              aria-labelledby={bead.comment_count > 0 ? "tab-details" : undefined}
              className={cn(
                "flex min-w-0 flex-col gap-4",
                bead.comment_count > 0 && tab !== "details" && cn("hidden", !embedded && "lg:flex"),
              )}
            >
              {bead.comment_count > 0 && !embedded && hidden && (
                <Button variant="outline" size="sm" className="hidden self-start lg:inline-flex" onClick={toggleHidden}>
                  {`Show discussion (${bead.comment_count})`}
                </Button>
              )}
                <header className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold wrap-anywhere">{gate === null ? bead.title : `Waits for ${gateWords(gate)} to merge`}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono wrap-anywhere">{bead.id}</span>
                    {gate === null ? <StateMark bead={bead} /> : <Badge variant="secondary">{gateState(bead.status)}</Badge>}
                    {bead.lane !== null && <LaneChip lane={bead.lane} />}
                    <PriorityPill priority={bead.priority} />
                    <SizeBadge points={bead.points} estimateMinutes={bead.estimate_minutes} />
                    <TypeBadge type={bead.issue_type} />
                    <KindBadge kind={bead.kind} />
                    {complexity !== null && (
                      <Badge variant="outline" className={cn(complexity === "high" ? "text-state-blocked" : "text-muted-foreground")}>
                        {`Complexity: ${complexity}`}
                      </Badge>
                    )}
                    {visibleLabels(bead).map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                  {bead.capabilities.length > 0 && (
                    <ul aria-label="Capabilities" className="flex flex-wrap items-center gap-2 text-sm">
                      {bead.capabilities.map((cap) => (
                        <li key={cap}>
                          <Badge variant="outline">{cap}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  {bead.points_reason !== null && bead.points_reason.trim() !== "" && (
                    <p className="text-sm text-muted-foreground wrap-anywhere">{bead.points_reason}</p>
                  )}
                  <FactList facts={facts} />
                  {bead.issue_type !== "epic" &&
                    (bead.children.length > 0 ||
                      [...bead.dependencies, ...bead.dependents].some((r) => r.type === "blocks")) && (
                    <Link
                      to={graphViewPath(project, { id: bead.id, parent: bead.milestone === bead.parent ? null : bead.parent }, bead.children.length > 0)}
                      className={cn(buttonVariants({ size: "sm" }), "self-start")}
                    >
                      View in graph
                    </Link>
                  )}
                </header>
                {bead.description === null ? (
                  <p className="text-muted-foreground">No description.</p>
                ) : (
                  <MarkdownText text={bead.description} />
                )}
                <TextSection title="Acceptance criteria" text={bead.acceptance_criteria} />
                <TextSection title="Design" text={bead.design} />
                <TextSection title="Notes" text={bead.notes} />
                <TextSection title="Close reason" text={bead.close_reason} />
                <RelationList title="Depends on" project={project} items={bead.dependencies} />
                <RelationList title="Blocks" project={project} items={bead.dependents} />
                <RelationList title="Bugs found" titleClassName="text-type-bug" project={project} items={bead.bugs} />
                {(total > 0 || prep !== null) && (
                  <div className="flex flex-col gap-2">
                    {total > 0 && <ProgressBar label="Children closed" percent={(closed / total) * 100} />}
                    <span className="flex items-center gap-3 text-sm">
                      {total > 0 && <span>{`${closed} of ${total} closed`}</span>}
                      {prep !== null && <span>{prep}</span>}
                    </span>
                  </div>
                )}
                <RelationList title="Children" project={project} items={bead.children} />
            </div>
          </div>
          {bead.comment_count > 0 && (
            <div
              role="tabpanel"
              id="panel-discussion"
              aria-labelledby="tab-discussion"
              tabIndex={0}
              className={cn(
                tab !== "discussion" && "hidden",
                !embedded && !hidden && cn("lg:block", SIDE_PANEL),
                !embedded && hidden && "lg:hidden",
              )}
            >
              <DiscussionPanel project={project} id={bead.id} onHide={embedded ? undefined : toggleHidden} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

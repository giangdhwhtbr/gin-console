import { useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/features/quota/ProgressBar";
import { BeadNotFoundError, fetchBead, type BeadDetail } from "./api";
import { Breadcrumb } from "./Breadcrumb";
import { DetailTabs, type DetailTab } from "./DetailTabs";
import { DiscussionPanel } from "./DiscussionPanel";
import { graphPath } from "./graph";
import { useDiscussionHidden } from "./discussion";
import { Reopens } from "./Reopens";
import { RelationList } from "./RelationList";
import { SIDE_PANEL } from "./side-panel";
import { TextSection } from "./TextSection";
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
  graphScope,
}: {
  project: string;
  id: string;
  embedded?: boolean;
  graphScope?: string | null;
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
  const closed = bead?.children.filter((c) => c.status === "closed").length ?? 0;
  const total = bead?.children.length ?? 0;

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
          <div className="flex flex-col gap-4">
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
                "flex flex-col gap-4",
                bead.comment_count > 0 && tab !== "details" && cn("hidden", !embedded && "lg:flex"),
              )}
            >
              {bead.comment_count > 0 && !embedded && hidden && (
                <Button variant="outline" size="sm" className="hidden self-start lg:inline-flex" onClick={toggleHidden}>
                  {`Show discussion (${bead.comment_count})`}
                </Button>
              )}
                <header className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold">{bead.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono">{bead.id}</span>
                    <Badge variant="secondary">{bead.status}</Badge>
                    <span>{`P${bead.priority}`}</span>
                    <TypeBadge type={bead.issue_type} />
                    {bead.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {[
                      bead.owner && `Owner ${bead.owner}`,
                      bead.assignee && `Assignee ${bead.assignee}`,
                      bead.created_by && `Created by ${bead.created_by}`,
                      `Created ${new Date(bead.created_at).toLocaleString()}`,
                      `Updated ${new Date(bead.updated_at).toLocaleString()}`,
                      `${bead.comment_count} comment${bead.comment_count === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <Reopens key={bead.id} project={project} id={bead.id} />
                  </div>
                  {bead.id !== graphScope &&
                    (bead.children.length > 0 ||
                      [...bead.dependencies, ...bead.dependents].some((r) => r.type === "blocks")) && (
                    <Link to={graphPath(project, bead.id)} className={cn(buttonVariants({ size: "sm" }), "self-start")}>
                      View dependencies
                    </Link>
                  )}
                </header>
                {bead.description === null ? (
                  <p className="text-muted-foreground">No description.</p>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{bead.description}</p>
                )}
                <TextSection title="Acceptance criteria" text={bead.acceptance_criteria} />
                <TextSection title="Design" text={bead.design} />
                <TextSection title="Notes" text={bead.notes} />
                <TextSection title="Close reason" text={bead.close_reason} />
                <RelationList title="Depends on" project={project} items={bead.dependencies} />
                <RelationList title="Blocks" project={project} items={bead.dependents} />
                <RelationList title="Bugs found" titleClassName="text-type-bug" project={project} items={bead.bugs} />
                {total > 0 && (
                  <div className="flex flex-col gap-2">
                    <ProgressBar label="Children closed" percent={(closed / total) * 100} />
                    <span className="text-sm">{`${closed} of ${total} closed`}</span>
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

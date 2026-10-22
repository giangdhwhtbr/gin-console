import { useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/features/quota/ProgressBar";
import { BeadNotFoundError, fetchBead, type BeadDetail } from "./api";
import { CommentList } from "./CommentList";
import { RelationList } from "./RelationList";
import { TextSection } from "./TextSection";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ok"; bead: BeadDetail };

export function BeadDetailPage({ project, id, embedded = false }: { project: string; id: string; embedded?: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

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
  const back = embedded ? (
    <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`} className="text-sm underline underline-offset-2">
      Open page
    </Link>
  ) : (
    <Link to={`/beads?project=${encodeURIComponent(project)}`} className="text-sm underline underline-offset-2">
      Back to beads
    </Link>
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
        <>
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{bead.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono">{bead.id}</span>
              <Badge variant="secondary">{bead.status}</Badge>
              <span>{`P${bead.priority}`}</span>
              <span>{bead.issue_type}</span>
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
            </div>
            {bead.issue_type === "epic" && (
              <Link
                to={`/beads?project=${encodeURIComponent(project)}&view=graph&epic=${encodeURIComponent(bead.id)}`}
                className="text-sm underline underline-offset-2"
              >
                View graph
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
          {total > 0 && (
            <div className="flex flex-col gap-2">
              <ProgressBar label="Children closed" percent={(closed / total) * 100} />
              <span className="text-sm">{`${closed} of ${total} closed`}</span>
            </div>
          )}
          <RelationList title="Children" project={project} items={bead.children} />
          {bead.comment_count > 0 && <CommentList project={project} id={bead.id} />}
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@/app/Link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BeadNotFoundError, fetchBead, type BeadDetail } from "./api";
import { BeadBody } from "./BeadBody";
import { BeadHeader } from "./BeadHeader";
import { Breadcrumb } from "./Breadcrumb";
import { DetailTabs, type DetailTab } from "./DetailTabs";
import { DiscussionPanel } from "./DiscussionPanel";
import { EpicPage } from "./EpicPage";
import { useDiscussionHidden } from "./discussion";
import { SIDE_PANEL } from "./side-panel";

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
  // REQ-UI-119: the page of an epic has tabs; its details panel keeps the compact form
  const epicPage = bead !== null && bead.issue_type === "epic" && !embedded;
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
      {epicPage && <EpicPage project={project} bead={bead} />}
      {bead !== null && !epicPage && (
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
              <BeadHeader project={project} bead={bead} />
              <BeadBody project={project} bead={bead} />
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

import { useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuotaStrip } from "@/features/quota/QuotaStrip";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { fetchProjects, type Project } from "./api";
import { ProjectCard } from "./ProjectCard";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; projects: Project[]; error: string | null };

const REFRESH_MS = 10_000;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function ProjectsPage() {
  // simplified: server state lives in component state; move to a query cache when a second
  // screen reads the same data.
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    void fetchProjects().then(
      (projects) => setState({ status: "ok", projects, error: null }),
      (error: unknown) =>
        setState((previous) =>
          previous.status === "ok"
            ? { ...previous, error: messageOf(error) }
            : { status: "error", message: messageOf(error) },
        ),
    );
  }, []);

  useVisibleInterval(load, REFRESH_MS);

  const retry = () => {
    if (state.status === "error") setState({ status: "loading" });
    load();
  };

  const errorMessage =
    state.status === "error" ? state.message : state.status === "ok" ? state.error : null;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Projects</h1>
      <QuotaStrip />
      {state.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && state.projects.length === 0 && (
        <p className="text-muted-foreground">
          No projects configured. Add them to <code>~/.config/gin-console/config.yaml</code> (or
          the file in <code>GIN_CONSOLE_CONFIG</code>) and restart the console.
        </p>
      )}
      {state.status === "ok" && state.projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

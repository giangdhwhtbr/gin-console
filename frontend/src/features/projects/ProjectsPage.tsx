import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchProjects, type Project } from "./api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; projects: Project[] };

export function ProjectsPage() {
  // simplified: server state lives in component state; move to a query cache when a second
  // screen reads the same data.
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    void fetchProjects().then(
      (projects) => setState({ status: "ok", projects }),
      (error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setState({ status: "loading" });
    load();
  };

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Projects</h1>
      {state.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Projects could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.projects.map((project) => (
              <TableRow key={project.name}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell className="font-mono text-sm">{project.path}</TableCell>
                <TableCell>
                  {!project.exists && <Badge variant="destructive">missing</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

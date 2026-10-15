import { useCallback, useState } from "react";
import { Link } from "@/app/Link";
import { navigate, useLocation } from "@/app/route";
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
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { fetchSessions, type SessionSummary } from "./api";
import { CopyResumeButton } from "./CopyResumeButton";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; sessions: SessionSummary[]; error: string | null };

const REFRESH_MS = 10_000;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function SessionsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    void fetchSessions().then(
      (sessions) => setState({ status: "ok", sessions, error: null }),
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

  const sessions = state.status === "ok" ? state.sessions : [];
  const { search } = useLocation();
  const filter = new URLSearchParams(search).get("project") ?? "";
  const projects = [...new Set([...sessions.map((s) => s.project), ...(filter ? [filter] : [])])].sort();
  const shown = filter ? sessions.filter((s) => s.project === filter) : sessions;
  const choose = (value: string) =>
    navigate(value ? `/sessions?project=${encodeURIComponent(value)}` : "/sessions");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Sessions</h1>
      {state.status === "loading" && <p className="text-muted-foreground">Loading sessions…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Sessions could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && (
        <label className="flex items-center gap-2 text-sm">
          Project
          <select
            value={filter}
            onChange={(event) => choose(event.target.value)}
            className="rounded border bg-background px-2 py-1"
          >
            <option value="">All projects</option>
            {projects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      {state.status === "ok" && shown.length === 0 && (
        <p className="text-muted-foreground">No sessions found.</p>
      )}
      {state.status === "ok" && shown.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              {["Title", "Project", "Cwd", "Modified", "Size", "Status", "Resume"].map((name) => (
                <TableHead key={name}>{name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link to={`/sessions/${encodeURIComponent(s.project)}/${s.id}`}>{s.title}</Link>
                </TableCell>
                <TableCell>{s.project}</TableCell>
                <TableCell className="font-mono text-sm">{s.cwd}</TableCell>
                <TableCell>{new Date(s.modified).toLocaleString()}</TableCell>
                <TableCell>{`${Math.max(1, Math.round(s.size / 1024))} KB`}</TableCell>
                <TableCell>
                  {s.live && (
                    <span className="flex items-center gap-1">
                      <Badge>live</Badge>
                      {[s.status, s.kind].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <CopyResumeButton command={s.resume_command} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

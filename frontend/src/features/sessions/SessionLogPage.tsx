import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/app/Link";
import { CopyResumeButton } from "./CopyResumeButton";
import { MessageView } from "./MessageView";
import {
  fetchMessages,
  fetchSessions,
  SessionNotFoundError,
  type Message,
  type SessionSummary,
} from "./api";

type Page = { offset: number; items: Message[] };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ok"; pages: Page[]; next: number | null; error: string | null };
// "first" starts the log over; "page" puts the page at its offset (replacing it if it is already
// there), so a repeated or refreshed request can never duplicate or drop a page.
type Mode = "first" | "page";

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function SessionLogPage({ project, id }: { project: string; id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const lastParams = useRef<{ offset: number; mode: Mode }>({ offset: 0, mode: "first" });

  const request = useCallback(
    (offset: number, mode: Mode) => {
      lastParams.current = { offset, mode };
      void fetchMessages(project, id, offset)
        .then(
          (result) =>
            setState((previous) => {
              const page: Page = { offset, items: result.items };
              const pages =
                mode === "first" || previous.status !== "ok"
                  ? [page]
                  : previous.pages.some((p) => p.offset === offset)
                    ? previous.pages.map((p) => (p.offset === offset ? page : p))
                    : [...previous.pages, page];
              return { status: "ok", pages, next: result.next_offset, error: null };
            }),
          (error: unknown) =>
            setState((previous) =>
              error instanceof SessionNotFoundError
                ? { status: "notfound" }
                : previous.status === "ok"
                  ? { ...previous, error: messageOf(error) }
                  : { status: "error", message: messageOf(error) },
            ),
        )
        .finally(() => setBusy(false));
    },
    [project, id],
  );

  useEffect(() => {
    request(0, "first");
  }, [request]);

  useEffect(() => {
    void fetchSessions(project).then(
      (sessions) => setSummary(sessions.find((s) => s.id === id) ?? null),
      () => setSummary(null), // the header is optional: the log is readable without it
    );
  }, [project, id]);

  // User-triggered requests: busy disables the buttons until the response is applied. The first
  // load is covered by the "loading" state instead (and may not set state inside an effect).
  const go = (offset: number, mode: Mode) => {
    setBusy(true);
    request(offset, mode);
  };

  const retry = () => {
    if (state.status === "error") setState({ status: "loading" });
    const { offset, mode } = lastParams.current;
    go(offset, mode);
  };

  const errorMessage =
    state.status === "error" ? state.message : state.status === "ok" ? state.error : null;
  const last = state.status === "ok" ? state.pages[state.pages.length - 1] : undefined;
  const messages = state.status === "ok" ? state.pages.flatMap((p) => p.items) : [];

  return (
    <section className="flex flex-col gap-4">
      <Link to="/sessions" className="text-sm underline underline-offset-2">
        Back to sessions
      </Link>
      {state.status === "notfound" ? (
        <p>Session not found</p>
      ) : (
        <>
          <header className="flex flex-col items-start gap-1">
            <h1 className="text-xl font-semibold">{summary?.title ?? id}</h1>
            {summary?.cwd && <span className="break-all font-mono text-sm">{summary.cwd}</span>}
            {summary && <CopyResumeButton command={summary.resume_command} />}
          </header>
          {state.status === "loading" && <p className="text-muted-foreground">Loading messages…</p>}
          {errorMessage !== null && (
            <Alert variant="destructive">
              <AlertTitle>Messages could not be loaded</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span>{errorMessage}</span>
                <Button variant="outline" size="sm" disabled={busy} onClick={retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {state.status === "ok" && (
            <div className="flex flex-col gap-3">
              {state.pages.flatMap((p) =>
                p.items.map((message, index) => (
                  <MessageView key={`${p.offset}-${index}`} message={message} />
                )),
              )}
              {messages.length === 0 && <p className="text-muted-foreground">No messages.</p>}
              <div className="flex gap-2">
                {state.next !== null && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => go(state.next ?? 0, "page")}
                  >
                    Load more
                  </Button>
                )}
                {summary?.live && last && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => go(last.offset, "page")}
                  >
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

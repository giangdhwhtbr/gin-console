import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchComments, type Comment } from "./api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; comments: Comment[] };

export function CommentList({ project, id }: { project: string; id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void fetchComments(project, id).then(
      (comments) => setState({ status: "ok", comments }),
      (error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, [project, id, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  return (
    <section aria-label="Comments" className="flex flex-col gap-3">
      <h2 className="font-medium">{state.status === "ok" ? `Comments (${state.comments.length})` : "Comments"}</h2>
      {state.status === "loading" && <p className="text-muted-foreground">Loading comments…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>The comments could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && (
        <ul className="flex flex-col gap-3">
          {state.comments.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1 rounded border p-2">
              <div className="text-sm text-muted-foreground">
                {`${comment.author} · ${new Date(comment.created_at).toLocaleString()}`}
              </div>
              <p className="whitespace-pre-wrap break-words">{comment.text}</p>
              {comment.truncated && <p className="text-xs text-muted-foreground">Comment truncated</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

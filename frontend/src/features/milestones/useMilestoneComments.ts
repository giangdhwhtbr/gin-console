import { useCallback, useEffect, useState } from "react";
import { fetchComments, type Comment } from "@/features/beads/api";

type Answer = { key: string; comments: Comment[]; error: string | null };

/** REQ-MILESTONE-UI-019: the comments of the milestone bead, loaded once per page and shared by the tab label and RetroTab. */
export function useMilestoneComments(project: string, id: string) {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const key = `${project}/${id}/${attempt}`;
  useEffect(() => {
    let current = true;
    fetchComments(project, id).then(
      (comments) => current && setAnswer({ key, comments, error: null }),
      (error: unknown) => current && setAnswer({ key, comments: [], error: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      current = false;
    };
  }, [project, id, key]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const done = answer?.key === key ? answer : null; // an answer to an earlier request counts as loading
  const state: "loading" | "error" | "ok" = done === null ? "loading" : done.error === null ? "ok" : "error";
  return { state, comments: done?.comments ?? [], error: done?.error ?? null, retry };
}

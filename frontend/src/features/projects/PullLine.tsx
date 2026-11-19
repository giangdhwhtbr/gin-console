import { formatAge, formatTimes } from "@/features/quota/format";
import type { PullResult } from "./api";

/** The last pull of a project's Beads: its age, no remote, or its error. */
export function PullLine({ pull, now }: { pull: PullResult; now: number }) {
  const failed = pull.status === "error";
  const text =
    pull.status === "ok"
      ? `pulled ${formatAge(pull.at, now)}`
      : pull.status === "no_remote"
        ? "no Dolt remote"
        : `pull failed: ${pull.error ?? "unknown error"}`;
  return (
    <p title={formatTimes(pull.at)} className={failed ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
      {text}
    </p>
  );
}

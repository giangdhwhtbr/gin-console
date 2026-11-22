import { formatDateTime } from "@/lib/dates";
import { formatAge } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { pullError, type PullResult } from "./api";

/** The last pull of a project's Beads: its age, no remote, or its error. */
export function PullLine({ pull }: { pull: PullResult }) {
  const now = useNow(30_000);
  const failed = pull.status === "error";
  const text =
    pull.status === "ok"
      ? `pulled ${formatAge(pull.at, now)}`
      : pull.status === "no_remote"
        ? "no Dolt remote"
        : `pull failed: ${pullError(pull)}`;
  return (
    <p title={formatDateTime(pull.at)} className={failed ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
      {text}
    </p>
  );
}

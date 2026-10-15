import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { useQuota } from "./useQuota";
import { LEVEL_LABEL, claudeStatus, codexStatus, type Level, type Status } from "./status";

const VARIANT: Record<Level, "secondary" | "outline" | "destructive"> = {
  ok: "secondary",
  near: "outline",
  limited: "destructive",
  "no-data": "outline",
  error: "destructive",
};

function Chip({ name, status }: { name: string; status: Status }) {
  const percent = status.percent === null ? "" : ` ${Math.round(status.percent)}%`;
  return (
    <Link to="/quota">
      <Badge variant={VARIANT[status.level]}>{`${name} ${LEVEL_LABEL[status.level]}${percent}`}</Badge>
    </Link>
  );
}

export function QuotaStrip() {
  const { snapshot } = useQuota();
  return (
    <section aria-label="Quota" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">Quota</span>
      {snapshot.status === "loading" && <span className="text-muted-foreground">Loading…</span>}
      {snapshot.status === "error" && (
        <span role="status" className="text-destructive">{`Quota unavailable: ${snapshot.message}`}</span>
      )}
      {snapshot.status === "ok" && (
        <>
          <Chip name="Claude" status={claudeStatus(snapshot.quota.claude)} />
          <Chip name="Codex" status={codexStatus(snapshot.quota.codex)} />
          {snapshot.error !== null && (
            <span role="status" className="text-muted-foreground">
              (refresh failed, showing the last answer)
            </span>
          )}
        </>
      )}
    </section>
  );
}

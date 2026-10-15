import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClaudeCard } from "./ClaudeCard";
import { CodexCard } from "./CodexCard";
import { useQuota } from "./useQuota";

export function QuotaPage() {
  const { snapshot, pending, reload, refresh } = useQuota();
  const errorMessage =
    snapshot.status === "error" ? snapshot.message : snapshot.status === "ok" ? snapshot.error : null;
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Quota</h1>
      {snapshot.status === "loading" && <p className="text-muted-foreground">Loading quota…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Quota could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" disabled={pending} onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {snapshot.status === "ok" && (
        <div className="grid gap-4 md:grid-cols-2">
          <ClaudeCard side={snapshot.quota.claude} pending={pending} onRefresh={refresh} />
          <CodexCard side={snapshot.quota.codex} />
        </div>
      )}
    </section>
  );
}

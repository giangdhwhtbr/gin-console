import { Alert, AlertDescription } from "@/components/ui/alert";

export type PullFailure = { project: string; path: string; error: string; kind?: "pull" | "attachments" };

/** One note per project whose Beads pull failed; nothing when none. */
export function PullNote({ failures }: { failures: readonly PullFailure[] }) {
  if (failures.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {failures.map(({ project, path, error, kind = "pull" }) => (
        <Alert key={`${kind}:${project}`}>
          <AlertDescription>
            {kind === "attachments" ? (
              <>
                Fetching attachments of {project} failed: {error}. Run{" "}
                <code>git fetch origin +refs/gin/attachments:refs/gin-console/attachments</code> in {path}.
              </>
            ) : (
              <>
                Pulling Beads of {project} failed: {error}. Run <code>bd dolt pull</code> in {path}.
              </>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

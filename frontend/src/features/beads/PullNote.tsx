import { Alert, AlertDescription } from "@/components/ui/alert";

/** One note per project whose Beads pull failed; nothing when none. */
export function PullNote({
  failures,
}: {
  failures: readonly { project: string; path: string; error: string }[];
}) {
  if (failures.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {failures.map(({ project, path, error }) => (
        <Alert key={project}>
          <AlertDescription>
            Pulling Beads of {project} failed: {error}. Run <code>bd dolt pull</code> in {path}.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

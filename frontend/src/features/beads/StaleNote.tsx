import { Alert, AlertDescription } from "@/components/ui/alert";

/** One note per project whose beads export may be out of date; nothing when none. */
export function StaleNote({ projects }: { projects: readonly string[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {projects.map((name) => (
        <Alert key={name}>
          <AlertDescription>
            Beads of {name} may be out of date. Run <code>bd export -o .beads/issues.jsonl</code> in {name}.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

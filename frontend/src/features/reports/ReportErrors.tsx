import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ProjectError } from "./api";

/** REQ-UI-093: the projects the report could not read, above the tabs so every tab shows them. */
export function ReportErrors({ errors }: { errors: readonly ProjectError[] }) {
  if (errors.length === 0) return null;
  return (
    <Alert>
      <AlertTitle>Some projects could not be read</AlertTitle>
      <AlertDescription>
        <ul>
          {errors.map((e) => (
            <li key={e.project}>
              {e.project}: {e.error}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

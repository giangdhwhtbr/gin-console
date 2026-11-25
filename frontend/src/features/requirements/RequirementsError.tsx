import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyCommand } from "@/features/milestones/CopyCommand";
import type { RequirementsFailure } from "./api";

function explain(error: RequirementsFailure): { title: string; body: string; command: string | null } {
  switch (error.kind) {
    case "outdated":
      return { title: "Requirements need a newer gin", body: "Run the gin installer, then reload this page.", command: "gin-workflow/install.sh" };
    case "schema":
      return { title: error.message, body: "This console reads schema 1. Update gin-console to read it.", command: null };
    default:
      return { title: "Requirements couldn't be loaded", body: error.message, command: null };
  }
}

/** REQ-REQUIREMENTS-019: the cause, and what to do about it. */
export function RequirementsError({ error, onRetry }: { error: RequirementsFailure; onRetry: () => void }) {
  const { title, body, command } = explain(error);
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>{body}</span>
        {command !== null && <CopyCommand command={command} />}
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

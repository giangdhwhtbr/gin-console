import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { MilestonesError } from "./api";
import { CopyCommand } from "./CopyCommand";

function explain(error: MilestonesError): { title: string; body: string; command: string | null } {
  switch (error.kind) {
    case "outdated":
      return { title: "Milestones need a newer gin-workflow", body: "Run the gin-workflow installer, then reload this page.", command: "gin-workflow/install.sh" };
    case "tracking":
      return {
        title: "This project tracks tasks in markdown",
        body: "Milestones live in Beads. Set providers.task_tracking: beads in the project's gin-workflow config.",
        command: null,
      };
    case "schema":
      return { title: error.message, body: "This console reads schema 1. Update gin-console to read it.", command: null };
    default:
      return { title: "Milestones couldn't be loaded", body: error.message, command: null };
  }
}

/** REQ-MILESTONE-UI-005: the cause, and what to do about it. */
export function MilestoneError({ error, onRetry }: { error: MilestonesError; onRetry: () => void }) {
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

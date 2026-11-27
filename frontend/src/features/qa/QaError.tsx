import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { QaFailure } from "./api";

/** REQ-QA-013: what is wrong with gin-qa, and what to do about it. */
export function QaError({ failure, onRetry }: { failure: QaFailure; onRetry: () => void }) {
  if (failure.cause === "missing")
    return (
      <Alert variant="destructive">
        <AlertDescription>gin-qa is not installed on the console host</AlertDescription>
      </Alert>
    );
  if (failure.cause === "outdated")
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This gin-qa is too old; run <code>gin-workflow/install.sh --plugin gin-qa</code>
        </AlertDescription>
      </Alert>
    );
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>{failure.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

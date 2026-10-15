import { useState } from "react";
import { Button } from "@/components/ui/button";

type State = "idle" | "copied" | "refused";

export function CopyResumeButton({ command }: { command: string }) {
  const [state, setState] = useState<State>("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("refused"); // no clipboard (insecure context) or permission denied: show the command
    }
  };
  return (
    <span className="flex flex-col items-start gap-1">
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        Copy resume
      </Button>
      {state === "copied" && <span className="text-sm text-muted-foreground">Copied</span>}
      {state === "refused" && (
        <input
          readOnly
          aria-label="Resume command"
          value={command}
          onFocus={(event) => event.currentTarget.select()}
          className="w-72 rounded border px-2 py-1 font-mono text-xs"
        />
      )}
    </span>
  );
}

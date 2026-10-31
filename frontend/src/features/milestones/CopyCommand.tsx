import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** A command shown in full, with a Copy button that reads "Copied" for 2 s. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // no clipboard (insecure context) or permission denied: the command stays on screen to select
    }
  };
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{command}</code>
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </span>
  );
}

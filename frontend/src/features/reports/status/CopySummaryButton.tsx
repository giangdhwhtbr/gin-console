import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

/** REQ-REPORTS-038: copies the text from `buildText` to the clipboard; reads "Copied" for 2 s, or shows "Couldn't copy" inline. */
export function CopySummaryButton({ buildText }: { buildText: () => string }) {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state !== "copied") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setState("copied");
    } catch {
      // no clipboard (insecure context) or permission denied
      setState("failed");
    }
  };
  return (
    <span className="flex flex-none items-center gap-2">
      {state === "failed" && (
        <span role="alert" className="text-xs text-state-blocked">
          Couldn't copy
        </span>
      )}
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        {state === "copied" ? "Copied" : "Copy summary"}
      </Button>
    </span>
  );
}

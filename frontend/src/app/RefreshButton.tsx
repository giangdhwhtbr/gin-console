import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ICON_BUTTON } from "./ThemeToggle";

/** Drops every answer the server keeps, then has the page load its data again. */
export function RefreshButton({ onRefreshed }: { onRefreshed: () => void }) {
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
    } catch {
      // the server could not be reached: the page reloads anyway and shows its own error
    } finally {
      setBusy(false);
      onRefreshed();
    }
  };
  return (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={busy}
      aria-busy={busy}
      aria-label="Refresh data"
      title="Refresh data"
      className={ICON_BUTTON}
    >
      <RefreshCw aria-hidden className={cn("size-5", busy && "animate-spin")} />
    </button>
  );
}

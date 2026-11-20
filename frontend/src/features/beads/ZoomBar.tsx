import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Zoom out, the scale, Zoom in and Fit to view. */
export function ZoomBar({ scale, onOut, onIn, onFit }: { scale: number; onOut: () => void; onIn: () => void; onFit: () => void }) {
  return (
    <div role="group" aria-label="Zoom" className="flex items-center gap-2">
      <Button size="sm" variant="outline" aria-label="Zoom out" onClick={onOut}>
        <Minus aria-hidden />
      </Button>
      <span className="w-12 text-center text-sm tabular-nums">{`${Math.round(scale * 100)}%`}</span>
      <Button size="sm" variant="outline" aria-label="Zoom in" onClick={onIn}>
        <Plus aria-hidden />
      </Button>
      <Button size="sm" variant="outline" onClick={onFit}>
        Fit to view
      </Button>
    </div>
  );
}

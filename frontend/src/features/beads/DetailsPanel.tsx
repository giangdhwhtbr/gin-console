import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BeadDetailPage } from "./BeadDetailPage";
import { SIDE_PANEL } from "./side-panel";

/** REQ-UI-045: the bead details beside a view; the caller clears the selection and returns focus on close. */
export function DetailsPanel({
  project,
  id,
  note,
  graphLink = true,
  onShowChildren,
  onClose,
}: {
  project: string;
  id: string;
  note?: string;
  /** "View in graph" on the embedded page (REQ-UI-053); the Graph and Lanes panels leave it out. */
  graphLink?: boolean;
  /** "Show children" next to "Open page" (REQ-UI-149). */
  onShowChildren?: () => void;
  onClose: () => void;
}) {
  return (
    <aside aria-label="Bead details" tabIndex={0} className={cn("hidden min-w-0 rounded border p-3 lg:block", SIDE_PANEL)}>
      <div className="flex flex-col gap-2">
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
            <X aria-hidden />
          </Button>
        </div>
        {note !== undefined && <p className="text-sm text-muted-foreground">{note}</p>}
        <BeadDetailPage key={`${project}/${id}`} project={project} id={id} embedded graphLink={graphLink} onShowChildren={onShowChildren} />
      </div>
    </aside>
  );
}

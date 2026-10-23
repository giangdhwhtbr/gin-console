import { Button } from "@/components/ui/button";
import { CommentList } from "./CommentList";

export function DiscussionPanel({ project, id, onHide }: { project: string; id: string; onHide?: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      {onHide !== undefined && (
        <div className="hidden justify-end lg:flex">
          <Button variant="ghost" size="sm" onClick={onHide}>
            Hide discussion
          </Button>
        </div>
      )}
      <CommentList project={project} id={id} />
    </div>
  );
}

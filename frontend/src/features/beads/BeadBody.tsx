import { ProgressBar } from "@/features/quota/ProgressBar";
import type { BeadDetail } from "./api";
import { MarkdownText } from "./MarkdownText";
import { childCounts, prepLabel } from "./prep";
import { RelationList } from "./RelationList";
import { TextSection } from "./TextSection";

/** The description, text sections, relations and children of a bead (REQ-UI-038), shared by the bead page and the Overview of an epic; `overview` leaves out the children (the Tracks table shows them) and heads the description. */
export function BeadBody({ project, bead, overview = false }: { project: string; bead: BeadDetail; overview?: boolean }) {
  const counts = childCounts(bead.children.map((c) => ({ labels: c.prep ? ["prep"] : [], status: c.status, waits_for: c.waits_for })));
  const closed = counts.closedTracks;
  const total = counts.tracks;
  const prep = prepLabel(counts);

  return (
    <>
      {overview && <h2 className="m-0 text-base font-bold">Description</h2>}
      {bead.description === null ? (
        <p className="text-muted-foreground">No description.</p>
      ) : (
        <MarkdownText text={bead.description} />
      )}
      <TextSection title="Acceptance criteria" text={bead.acceptance_criteria} />
      <TextSection title="Design" text={bead.design} />
      <TextSection title="Notes" text={bead.notes} />
      <TextSection title="Close reason" text={bead.close_reason} />
      <RelationList title="Depends on" project={project} items={bead.dependencies} />
      <RelationList title="Blocks" project={project} items={bead.dependents} />
      <RelationList title="Bugs found" titleClassName="text-type-bug" project={project} items={bead.bugs} />
      {!overview && (total > 0 || prep !== null) && (
        <div className="flex flex-col gap-2">
          {total > 0 && <ProgressBar label="Children closed" percent={(closed / total) * 100} />}
          <span className="flex items-center gap-3 text-sm">
            {total > 0 && <span>{`${closed} of ${total} closed`}</span>}
            {prep !== null && <span>{prep}</span>}
          </span>
        </div>
      )}
      {!overview && <RelationList title="Children" project={project} items={bead.children} />}
    </>
  );
}

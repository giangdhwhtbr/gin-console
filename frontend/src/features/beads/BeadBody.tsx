import { Strand } from "@/components/Strand";
import type { BeadDetail } from "./api";
import { MarkdownText } from "./MarkdownText";
import { prepLabel, progressOf } from "./progress";
import { RelationList } from "./RelationList";
import { TextSection } from "./TextSection";

/** The description, text sections, relations and children of a bead (REQ-UI-038), shared by the bead page and the Overview of an epic; `overview` leaves out the children (the Tracks table shows them) and heads the description. */
export function BeadBody({ project, bead, overview = false }: { project: string; bead: BeadDetail; overview?: boolean }) {
  const progress = progressOf(bead);
  const prep = progress.prepTotal > 0 ? prepLabel(progress) : null;

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
      {!overview && (progress.total > 0 || prep !== null) && (
        <div className="flex items-center gap-3 text-sm">
          <Strand counts={progress.counts} noun="tracks" />
          {prep !== null && <span>{prep}</span>}
        </div>
      )}
      {!overview && <RelationList title="Children" project={project} items={bead.children} />}
    </>
  );
}

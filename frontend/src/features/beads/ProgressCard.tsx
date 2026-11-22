import { FactList } from "@/components/FactList";
import { Strand } from "@/components/Strand";
import type { BeadDetail } from "./api";
import { epicProgress } from "./epicOverview";
import { OverviewCard } from "./OverviewCard";
import { progressOf } from "./progress";
import type { BeadsState } from "./useBeads";

/** REQ-UI-120: the large strand of the tracks with its sentence, then Points, Bugs and Prep. */
export function ProgressCard({ bead, beads }: { bead: BeadDetail; beads: BeadsState }) {
  if (beads.status !== "ok") {
    return (
      <OverviewCard title="Progress">
        <p className={beads.status === "error" ? "text-destructive" : "text-muted-foreground"}>
          {beads.status === "error" ? beads.message : "Loading progress…"}
        </p>
      </OverviewCard>
    );
  }
  const children = beads.beads.filter((b) => b.parent === bead.id);
  const { points } = epicProgress(children);
  const { counts, prepDone, prepTotal } = progressOf(bead);
  const openBugs = bead.bugs.filter((b) => b.status !== "closed").length;
  return (
    <OverviewCard title="Progress">
      <Strand size="lg" counts={counts} noun="tracks" />
      <FactList
        layout="inline"
        facts={[
          { label: "Points", value: points === null ? "No points" : `${points.done} of ${points.total} pt done` },
          { label: "Bugs", value: `${openBugs} open` },
          { label: "Prep", value: prepTotal === 0 ? "none" : `${prepDone}/${prepTotal}` },
        ]}
      />
    </OverviewCard>
  );
}

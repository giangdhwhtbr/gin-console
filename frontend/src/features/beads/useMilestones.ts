import { useEffect, useState } from "react";
import { fetchMilestones } from "./api";
import type { MilestonesState } from "./milestoneChoice";

/** The project's milestones; an answer for another project counts as still loading. */
export function useMilestones(project: string): MilestonesState {
  const [loaded, setLoaded] = useState<{ project: string; state: MilestonesState } | null>(null);
  useEffect(() => {
    if (project === "") return;
    let current = true;
    void fetchMilestones(project).then(
      (data) => current && setLoaded({ project, state: { status: "ok", data } }),
      () => current && setLoaded({ project, state: { status: "error" } }),
    );
    return () => {
      current = false;
    };
  }, [project]);
  return loaded !== null && loaded.project === project ? loaded.state : { status: "loading" };
}

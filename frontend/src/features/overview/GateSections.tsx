import { fetchEpicWorkflow } from "@/features/beads/api";
import type { EpicWorkflow } from "@/features/projects/api";
import { countHint } from "@/lib/definitions";
import type { ProjectOverview } from "./api";
import { AttentionSection } from "./AttentionSection";
import { BeadLink } from "./BeadLink";
import { gateIssues, waiversOf } from "./gates";
import { createSlots, useKeyed, type Answer } from "./useKeyed";

/** Shared by every mount: requests of a page that was left or refreshed still count (REQ-OVERVIEW-008). */
const GATE_SLOTS = createSlots(4);

function load(key: string): Promise<EpicWorkflow> {
  const parsed: unknown = JSON.parse(key);
  const [project, id] = Array.isArray(parsed) ? parsed.map(String) : ["", ""];
  return fetchEpicWorkflow(project, id);
}

/** REQ-OVERVIEW-008: the workflow of each epic in progress, asked once, at most 4 at a time. */
export function useGates(projects: readonly ProjectOverview[]) {
  const epics = projects.flatMap((p) => p.epics.map((epic) => ({ project: p.name, epic, key: JSON.stringify([p.name, epic.id]) })));
  const answers = useKeyed(epics.map((e) => e.key), load, GATE_SLOTS);
  const done = epics.filter((e) => answers.has(e.key)).length;
  return { epics, answers, pending: done < epics.length ? `Checking ${done} of ${epics.length}` : null };
}

type Gates = ReturnType<typeof useGates>;
const okOf = (answer: Answer<EpicWorkflow> | undefined) => (answer?.status === "ok" ? answer.data : null);

export function GatesSection({ gates }: { gates: Gates }) {
  const rows = gates.epics.flatMap(({ project, epic, key }) => {
    const workflow = okOf(gates.answers.get(key));
    const issues = workflow === null ? [] : gateIssues(workflow);
    if (issues.length === 0) return [];
    const content = (
      <>
        <BeadLink project={project} {...epic} />
        <span className="text-xs text-muted-foreground">{project}</span>
        <span>{issues.join(", ")}</span>
      </>
    );
    return [{ key, id: epic.id, content }];
  });
  const failed = gates.epics.flatMap(({ project, epic, key }) => {
    const answer = gates.answers.get(key);
    return answer?.status === "error" ? [{ project, epic, key, message: answer.message }] : [];
  });
  const footer =
    failed.length === 0
      ? null
      : failed.map(({ project, epic, key, message }) => (
          <p key={key} className="text-sm text-destructive">
            Could not read gates of <BeadLink project={project} {...epic} /> in {project}: {message}
          </p>
        ));
  return <AttentionSection title="Gates not met" hint={countHint("overviewGates", "all projects")} rows={rows} pending={gates.pending} footer={footer} />;
}

export function WaiversSection({ gates }: { gates: Gates }) {
  const rows = gates.epics.flatMap(({ project, epic, key }) => {
    const workflow = okOf(gates.answers.get(key));
    if (workflow === null) return [];
    return waiversOf(workflow).map(({ subject, reason }, n) => ({
      key: `${key}/${n}`, // an answer never changes, so the place of a waiver in it is stable
      id: epic.id,
      content: (
        <>
          <BeadLink project={project} {...epic} />
          <span className="text-xs text-muted-foreground">{project}</span>
          {/* a waiver that is not of a gate is of a reviewed bead */}
          {Object.hasOwn(workflow.gates, subject) ? <span>{subject}</span> : <BeadLink project={project} id={subject} />}
          <span>{reason}</span>
        </>
      ),
    }));
  });
  return <AttentionSection title="Waivers" hint={countHint("overviewWaivers", "all projects")} rows={rows} pending={gates.pending} />;
}

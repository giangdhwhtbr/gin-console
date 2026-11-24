import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberProject, setFavorite } from "@/app/project";
import { HintProvider } from "@/components/HintProvider";
import { bead, json } from "@/features/beads/beadFixtures";
import { DEFINITIONS } from "@/lib/definitions";
import { ForecastCard } from "./milestones/ForecastCard";
import { GanttChart } from "./milestones/GanttChart";
import { detail, entry, epicPlan, forecast, list, stubMilestones } from "./milestones/milestoneFixtures";
import { MilestonesPage } from "./milestones/MilestonesPage";
import { MilestoneVelocity } from "./milestones/MilestoneVelocity";
import { DeliverySection } from "./reports/DeliverySection";
import { report } from "./reports/reportFixtures";
import { TeamFigures } from "./reports/team/TeamFigures";
import { teamReport, teamTotals } from "./reports/team/teamFixtures";
import { VelocityFigures } from "./reports/velocity/VelocityFigures";
import { VelocityTable } from "./reports/velocity/VelocityTable";
import { vel } from "./reports/velocity/velocityFixtures";

beforeEach(() => {
  setFavorite(null);
  rememberProject("alpha");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// REQ-UI-134: each renamed label carries the shared tooltip (REQ-UI-132) that says what it counts
async function hoverShows(element: HTMLElement, text: string) {
  await userEvent.setup().hover(element);
  expect(await screen.findByRole("tooltip")).toHaveTextContent(text);
}
const withHints = (node: React.ReactElement) => render(<HintProvider>{node}</HintProvider>);

describe("plain labels carry a tooltip", () => {
  it("REQ-UI-134 Milestones list headers", async () => {
    window.history.replaceState(null, "", "/milestones?project=alpha");
    stubMilestones(() => json(list([entry("m-1", { title: "Beta" })])));
    withHints(<MilestonesPage />);
    await screen.findByRole("link", { name: "Beta" });
    await hoverShows(screen.getByText("Parallel lanes", { selector: "li[aria-hidden] span" }), DEFINITIONS.parallelLanes);
    cleanup();
    stubMilestones(() => json(list([entry("m-1", { title: "Beta" })])));
    withHints(<MilestonesPage />);
    await screen.findByRole("link", { name: "Beta" });
    await hoverShows(screen.getByText("Commitment met", { selector: "li[aria-hidden] span" }), DEFINITIONS.commitmentMet);
  });

  it.each([
    ["Parallel lanes", DEFINITIONS.parallelLanes],
    ["Not estimated", DEFINITIONS.notEstimated],
    ["Days per point", DEFINITIONS.daysPerPoint],
  ])("REQ-UI-134 ForecastCard %s", async (label, text) => {
    withHints(<ForecastCard forecast={forecast()} today="2026-11-08" daysPerPoint={{ value: 1.4, measured_epics: 3, assumed: false }} />);
    await hoverShows(screen.getByText(label), text);
  });

  it.each([
    ["Commitment met", DEFINITIONS.commitmentMet],
    ["Days per point", DEFINITIONS.daysPerPoint],
  ])("REQ-UI-134 milestone velocity %s", async (label, text) => {
    withHints(<MilestoneVelocity velocity={vel({ committed_points: 13, say_do: 0.62, days_per_point: 1.4 })} />);
    await hoverShows(screen.getByText(label), text);
  });

  it.each([
    ["d/t strand", /^\d\/\d$/, DEFINITIONS.progress],
    ["Prep d/t", /^Prep \d\/\d$/, DEFINITIONS.prep],
    ["Spec approved", /^Spec approved$/, DEFINITIONS.specApproved],
    ["Spec not approved yet", /^Spec not approved yet$/, DEFINITIONS.specApproved],
  ])("REQ-UI-134 Gantt row %s", async (_name, pattern, text) => {
    const plan = detail([epicPlan("e-a", { spec_confirmed: !String(pattern).includes("not") }), epicPlan("e-b", { spec_confirmed: false })]);
    withHints(
      <GanttChart
        project="alpha"
        plan={plan}
        preview={false}
        zoom="all"
        onZoom={vi.fn()}
        childBeads={new Map()}
        epicBeads={new Map([["e-a", bead("e-a", { child_counts: { total: 2, closed: 1, prep_total: 2, prep_closed: 1 } })]])}
      />,
    );
    const row = document.querySelector<HTMLElement>(String(pattern).includes("not") ? "[data-epic='e-b']" : "[data-epic='e-a']") ?? document.body;
    const target = [...row.querySelectorAll<HTMLElement>("span[data-hint]")].find((el) => pattern.test(el.textContent ?? ""));
    if (target === undefined) throw new Error(`no hinted span for ${_name}`);
    await hoverShows(target, text);
  });

  it.each([
    ["Commitment met", DEFINITIONS.commitmentMet],
    ["Days per point", DEFINITIONS.daysPerPoint],
    ["Planned days per point", DEFINITIONS.daysPerPoint],
  ])("REQ-UI-134 Velocity table head %s", async (label, text) => {
    withHints(<VelocityTable points={[{ id: "m1", title: "M1", start: "2026-10-01", velocity: vel() }]} selected={null} />);
    await hoverShows(screen.getByText(label), text);
  });

  it.each([
    ["Days per point", DEFINITIONS.daysPerPoint],
    ["Commitment met", DEFINITIONS.commitmentMet],
  ])("REQ-UI-134 Velocity figure %s", async (label, text) => {
    withHints(<VelocityFigures daysPerPoint={{ value: 1.4, measured_epics: 3, assumed: false }} latest={null} />);
    await hoverShows(screen.getByText(label), text);
  });

  it("REQ-UI-134 Delivery days per point", async () => {
    const base = report();
    const row = { project: "alpha", id: "p-1", title: "p-1", estimate_days: null, points: 5, actual_days: 6, days_per_point: 1.2 };
    withHints(<DeliverySection delivery={{ ...base.delivery, estimates: [row] }} scope={{ kind: "period", days: 30 }} />);
    await hoverShows(screen.getByText("1.2 days per point"), DEFINITIONS.daysPerPoint);
  });

  it("REQ-UI-134 Team Open unassigned", async () => {
    const rep = teamReport();
    withHints(<TeamFigures team={{ ...teamTotals, blocked: 3, unclaimed: 8 }} member={null} milestone={rep.milestones[1]} />);
    await hoverShows(screen.getByText(/unassigned/), DEFINITIONS.unassigned);
  });
});

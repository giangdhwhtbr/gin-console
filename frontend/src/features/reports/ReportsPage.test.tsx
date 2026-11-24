import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberProject, setFavorite } from "@/app/project";
import { clearOrigin, getOrigin } from "@/app/origin";
import { navigate } from "@/app/route";
import type { Report } from "./api";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import { ReportsPage } from "./ReportsPage";
import { useSections } from "./sectionStore";
import { report } from "./reportFixtures";
import { teamReport as teamFixture, teamTotals } from "./team/teamFixtures";
import type { TeamReport } from "./teamApi";
import { vel } from "./velocity/velocityFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const project = (name: string) => ({ name, path: `/x/${name}`, exists: true, beads: null });

/** The team report of a period: no milestone selected, and no working days, pace needed or on time. */
const periodTeam = (days: number, over: Partial<TeamReport> = {}): TeamReport =>
  teamFixture({
    milestone: null,
    period_days: days,
    team: { ...teamTotals, working_days: null, elapsed: null, days_left: null, pace_needed: null, on_time: null },
    ...over,
  });
/** The team answer for the scope asked for: a period, the milestone asked for, or the server's default `m2`. */
const teamFor = (url: URL): TeamReport => {
  const days = url.searchParams.get("days");
  return days !== null ? periodTeam(Number(days)) : teamFixture({ milestone: url.searchParams.get("milestone") ?? "m2" });
};

const stub = (
  handler: (url: URL) => Response | Promise<Response> = () => json(report()),
  team: (url: URL) => Response | Promise<Response> = (url) => json(teamFor(url)),
  milestones: (url: URL) => Response | Promise<Response> = () => json(list([entry("m1")], { days_per_point: { value: 1.4, measured_epics: 6, assumed: false } })),
) => {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, "http://localhost");
    if (url.pathname === "/api/projects/beads") return Promise.resolve(json([project("alpha"), project("beta")]));
    if (url.pathname === "/api/reports") return Promise.resolve(handler(url));
    if (url.pathname === "/api/reports/team") return Promise.resolve(team(url));
    if (url.pathname === "/api/milestones") return Promise.resolve(milestones(url));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};
const requested = (mock: ReturnType<typeof stub>) => mock.mock.calls.map(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url));
const withClosed = (closed: number): Report => report({ totals: { ...report().totals, closed } });
const at = () => window.location.pathname + window.location.search;
const open = (path: string) => {
  window.history.replaceState(null, "", path);
  render(<ReportsPage />);
};
const scopeSelect = () => screen.findByRole("combobox", { name: "Report scope" });
const sectionLink = (name: RegExp) => within(screen.getByRole("navigation", { name: "Report sections" })).getByRole("link", { name });

beforeEach(() => window.history.replaceState(null, "", "/reports/status"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const teamCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/reports/team"));
const reportCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/reports?"));
const milestoneCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/milestones"));

beforeEach(() => {
  setFavorite(null);
  rememberProject("alpha");
});

const lateTeam = (over: Partial<TeamReport["team"] & object>): TeamReport => {
  const base = teamFixture();
  return teamFixture({ team: base.team === null ? null : { ...base.team, ...over } });
};

describe("ReportsPage paths", () => {
  it("REQ-UI-095 old tab links go to their section without a history entry", async () => {
    const cases: [string, string][] = [
      ["/reports?project=alpha&days=7&tab=quality", "/reports/rework?project=alpha&days=7"],
      ["/reports?project=alpha&days=30&tab=coverage", "/reports/status?project=alpha&days=30"],
      ["/reports?project=alpha&days=30&tab=usage", "/reports/status?project=alpha&days=30"],
      ["/reports?project=alpha&days=30", "/reports/status?project=alpha&days=30"],
    ];
    for (const [from, to] of cases) {
      stub();
      const before = window.history.length;
      open(from);
      await waitFor(() => expect(at()).toBe(to));
      expect(window.history.length).toBe(before);
      cleanup();
    }
  });

  it("REQ-UI-095 /reports goes to Status, and the default scope follows", async () => {
    stub();
    const before = window.history.length;
    open("/reports?project=alpha");
    await waitFor(() => expect(at()).toBe("/reports/status?project=alpha&milestone=m2"));
    expect(window.history.length).toBe(before);
  });

  it("REQ-UI-095 unknown section: a path naming no section shows the not-found page and asks for no report", async () => {
    const mock = stub();
    open("/reports/nope?project=alpha");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("/reports/nope")).toBeInTheDocument();
    expect(reportCalls(mock)).toEqual([]);
    expect(teamCalls(mock)).toEqual([]);
  });

  it("REQ-REPORTS-033 Old link with a sprint and both keys keeps the milestone, without a history entry", async () => {
    const mock = stub();
    const before = window.history.length;
    open("/reports/delivery?project=alpha&days=7&milestone=m1&sprint=s7");
    await screen.findByText("Beads closed");
    expect(at()).toBe("/reports/delivery?project=alpha&milestone=m1");
    expect(window.history.length).toBe(before);
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&milestone=m1"]);
    expect(requested(mock).some((u) => u.includes("sprint"))).toBe(false);
  });
});

describe("ReportsPage", () => {
  it("REQ-UI-073 remembers its place for the breadcrumb of a bead page", async () => {
    clearOrigin();
    stub();
    open("/reports/delivery?project=alpha&days=30");
    await screen.findByText("Beads closed");
    expect(getOrigin()).toMatchObject({ kind: "reports", path: "/reports/delivery", search: "?project=alpha&days=30", project: "alpha" });
  });

  it("REQ-UI-088 shared link: Last 7 days is selected and the report for alpha and 7 days is requested", async () => {
    const mock = stub();
    open("/reports/delivery?project=alpha&days=7");
    await screen.findByText("Beads closed");
    expect(screen.queryByLabelText("Project")).not.toBeInTheDocument();
    expect(await scopeSelect()).toHaveDisplayValue("Last 7 days");
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&days=7"]);
  });

  it("REQ-UI-088 Old link for all projects is rewritten to the current project", async () => {
    rememberProject("beta");
    const mock = stub();
    open("/reports/delivery?project=all&days=7");
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=beta&days=7");
    expect(requested(mock).some((u) => u.includes("project=all"))).toBe(false);
    await waitFor(() => expect(at()).toBe("/reports/delivery?project=beta&days=7"));
    expect(await scopeSelect()).toHaveDisplayValue("Last 7 days");
    expect(screen.queryByText(/No project all/)).not.toBeInTheDocument();
  });

  it("REQ-UI-088 the current project beats the first one when the URL has none", async () => {
    rememberProject("beta");
    const mock = stub();
    open("/reports/delivery");
    await screen.findByText("Beads closed");
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=beta"]);
    expect(reportCalls(mock)).toEqual(["/api/reports?project=beta&milestone=m2"]);
  });

  it("REQ-UI-126 an unknown project gets a notice and no report request", async () => {
    const mock = stub();
    open("/reports/delivery?project=zzz");
    expect(await screen.findByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "beta" })).toHaveAttribute("href", "/reports/delivery?project=beta");
    expect(reportCalls(mock)).toEqual([]);
    expect(at()).toBe("/reports/delivery?project=zzz");
    expect(screen.queryByLabelText("Project")).not.toBeInTheDocument();
  });

  it("REQ-UI-088 change scope: picking Last 90 days requests the report again, with a history entry", async () => {
    const mock = stub();
    open("/reports/delivery?days=30");
    await screen.findByText("Beads closed");
    await waitFor(() => expect(at()).toBe("/reports/delivery?project=alpha&days=30"));
    const before = window.history.length;
    await userEvent.selectOptions(await scopeSelect(), "Last 90 days");
    expect(at()).toBe("/reports/delivery?project=alpha&days=90");
    expect(window.history.length).toBe(before + 1);
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=90");
  });

  it("REQ-REPORTS-033 Pick a period: from a milestone to Last 7 days, with a history entry", async () => {
    const mock = stub();
    open("/reports/delivery?project=alpha&milestone=m1");
    await screen.findByText("Beads closed");
    const before = window.history.length;
    await userEvent.selectOptions(await scopeSelect(), "Last 7 days");
    expect(at()).toBe("/reports/delivery?project=alpha&days=7");
    expect(window.history.length).toBe(before + 1);
    await screen.findByText("Beads closed in the last 7 days");
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&milestone=m1", "/api/reports?project=alpha&days=7"]);
  });

  it("REQ-REPORTS-033 the delivery sentence names the milestone of the scope", async () => {
    stub();
    open("/reports/delivery?project=alpha&milestone=m1");
    expect(await screen.findByText("Beads of Milestone one closed")).toBeInTheDocument();
  });

  it("REQ-REPORTS-033 Scope kept across sections: Delivery asks for the report of the milestone", async () => {
    const mock = stub();
    open("/reports/team?project=alpha&milestone=m1");
    await screen.findByText("Closed, 2 d late");
    await userEvent.click(sectionLink(/^Delivery/));
    expect(at()).toBe("/reports/delivery?project=alpha&milestone=m1");
    await screen.findByText("Beads closed");
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&milestone=m1"]);
  });

  it("REQ-UI-088 scope kept across sections: Last 7 days on Delivery stays through Team and Rework", async () => {
    stub();
    open("/reports/delivery?project=alpha&days=30");
    await userEvent.selectOptions(await scopeSelect(), "Last 7 days");
    await userEvent.click(sectionLink(/^Team/));
    expect(await screen.findByRole("heading", { name: /^Last 7 days, / })).toBeInTheDocument();
    await userEvent.click(sectionLink(/^Rework/));
    expect(at()).toBe("/reports/rework?project=alpha&days=7");
    expect(await scopeSelect()).toHaveDisplayValue("Last 7 days");
  });

  it("REQ-UI-095 shared link: Rework is marked current and its panel shows the report for alpha and 7 days", async () => {
    const mock = stub();
    open("/reports/rework?project=alpha&days=7");
    const panel = await screen.findByRole("region", { name: "Rework" });
    expect((await within(panel).findAllByText("Rework rate")).length).toBeGreaterThan(0);
    expect(sectionLink(/^Rework/)).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")).toHaveLength(1);
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&days=7"]);
  });

  it("REQ-UI-095 change section: the URL keeps the scope and no new report is requested", async () => {
    const mock = stub();
    open("/reports/delivery?project=alpha&days=90");
    await screen.findByText("Beads closed");
    const before = reportCalls(mock).length;
    await userEvent.click(sectionLink(/^Rework/));
    expect(at()).toBe("/reports/rework?project=alpha&days=90");
    expect((await screen.findAllByText("Rework rate")).length).toBeGreaterThan(0);
    expect(reportCalls(mock)).toHaveLength(before);
  });

  it("REQ-UI-095 change section keeps the member and the status", async () => {
    stub();
    open("/reports/team?project=alpha&milestone=m2&member=ann&status=closed");
    await screen.findByLabelText("Member");
    expect(sectionLink(/^Delivery/)).toHaveAttribute("href", "/reports/delivery?project=alpha&milestone=m2&member=ann&status=closed");
  });

  it("REQ-UI-095 headlines: Delivery and Rework under their names, none under Status, and no Quality section", async () => {
    stub();
    open("/reports/delivery?project=alpha&milestone=m2");
    expect(await screen.findByRole("link", { name: /Delivery\s*4 beads closed/ })).toBeInTheDocument();
    expect(sectionLink(/Rework\s*25% rework/)).toBeInTheDocument();
    expect(sectionLink(/^Status/)).toHaveAccessibleName("Status");
    expect(screen.queryByText(/Quality|AI usage|Data coverage/)).toBeNull();
  });

  it("REQ-UI-095 the Rework headline reads a dash without a rate", async () => {
    stub(() => json(report({ totals: { closed: 0, rework_rate: null } })));
    open("/reports/rework?project=alpha&days=30");
    expect(await screen.findByRole("link", { name: /Rework\s*— rework/ })).toBeInTheDocument();
  });

  it("REQ-UI-095 period headlines: Status has none and Team counts the members without Unassigned", async () => {
    const members = teamFixture().members;
    stub(undefined, () => json(periodTeam(30, { members: [members[0], { ...members[0], member: "bao" }, members[1]] })));
    open("/reports/delivery?project=alpha&days=30");
    expect(await screen.findByRole("link", { name: /^Team\s*2 members$/ })).toBeInTheDocument();
    expect(sectionLink(/^Status/)).toHaveAccessibleName("Status");
  });

  it("REQ-UI-095 shows no headline after a failed load", async () => {
    stub(() => json({ error: "boom" }, 502));
    open("/reports/delivery?project=alpha&days=30");
    await screen.findByText("boom");
    for (const name of ["Delivery", "Rework"]) expect(sectionLink(new RegExp(`^${name}$`))).toBeInTheDocument();
  });

  it("REQ-UI-095 velocity section shows the headline of the list the page already asked for, once", async () => {
    const mock = stub();
    open("/reports/delivery?project=alpha&days=30");
    await screen.findByText("Beads closed");
    await userEvent.click(sectionLink(/^Velocity/));
    expect(window.location.pathname).toBe("/reports/velocity");
    expect(await screen.findByRole("link", { name: /^Velocity.*1\.4 days per point/ })).toBeTruthy();
    expect(milestoneCalls(mock)).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-UI-095 requests the Milestones list once for a project when switching Team, Delivery and Velocity", async () => {
    const mock = stub();
    open("/reports/team?project=alpha&milestone=m2");
    await screen.findByText("working day 9 of 20, 11 left");
    await userEvent.click(sectionLink(/^Delivery/));
    await screen.findByText("Beads closed");
    await userEvent.click(sectionLink(/^Velocity/));
    expect(await screen.findByText("1.4 days per point", { selector: "dd" })).toBeTruthy();
    await userEvent.click(sectionLink(/^Team/));
    await screen.findByText("working day 9 of 20, 11 left");
    expect(milestoneCalls(mock)).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-UI-095 opening Velocity first still requests the Milestones list once", async () => {
    const mock = stub();
    open("/reports/velocity?project=alpha&milestone=m2");
    expect(await screen.findByRole("link", { name: /^Velocity.*1\.4 days per point/ })).toBeTruthy();
    await screen.findByText("No kicked-off milestones with points yet");
    expect(milestoneCalls(mock)).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-REPORTS-018 Milestones with velocity: the milestone of the scope is marked; Period scope marks none", async () => {
    const velocityList = () =>
      json(
        list([
          entry("m1", { status: "closed", start: "2026-10-01", velocity: vel() }),
          entry("m2", { status: "active", start: "2026-11-03", velocity: vel({ committed_points: 13, completed_points: 5 }) }),
        ]),
      );
    stub(undefined, undefined, velocityList);
    open("/reports/velocity?project=alpha&milestone=m2");
    const rows = (await screen.findAllByRole("row")).slice(1);
    expect(rows.map((r) => r.getAttribute("aria-current"))).toEqual([null, "true"]);
    cleanup();
    stub(undefined, undefined, velocityList);
    open("/reports/velocity?project=alpha&days=30");
    const periodRows = (await screen.findAllByRole("row")).slice(1);
    expect(periodRows).toHaveLength(2);
    expect(periodRows.filter((r) => r.hasAttribute("aria-current"))).toHaveLength(0);
  });

  it("REQ-UI-095 late milestone headline: the forecast of the selected milestone, with a warning icon", async () => {
    stub(
      undefined,
      () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })),
      () => json(list([entry("m2", { status: "active", start: "2026-11-02", end: "2026-11-27", finish: "2027-02-16" })], { today: "2026-11-12" })),
    );
    open("/reports/delivery?project=alpha&milestone=m2");
    const link = await screen.findByRole("link", { name: /Team\s*27 of 64 done, late/ });
    expect(link.querySelector("svg")).not.toBeNull();
  });

  it("REQ-UI-095 the Team headline applies the rule without the forecast while the list loads or after it failed", async () => {
    stub(undefined, () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })), () => json({ error: "gin is down" }, 502));
    open("/reports/delivery?project=alpha&milestone=m2");
    expect(await screen.findByRole("link", { name: /Team\s*27 of 64 done, on pace/ })).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 late active milestone: the Team status reads Active, late once the list has the forecast", async () => {
    stub(
      undefined,
      undefined,
      () => json(list([entry("m2", { status: "active", start: "2026-11-02", end: "2026-11-27", finish: "2027-02-16" })], { today: "2026-11-12" })),
    );
    open("/reports/team?project=alpha&milestone=m2");
    await screen.findByText("working day 9 of 20, 11 left");
    await vi.waitFor(() => expect(document.querySelector("[data-milestone-status]")).toHaveTextContent("Active, late"));
  });

  it("REQ-UI-095 Velocity says Loading velocity… while the page's Milestones request is open", async () => {
    let release: (response: Response) => void = () => {};
    const mock = stub(undefined, undefined, () => new Promise<Response>((resolve) => { release = resolve; }));
    open("/reports/velocity?project=alpha&milestone=m2");
    expect(await screen.findByText("Loading velocity…")).toBeInTheDocument();
    release(json(list([entry("m1")], { days_per_point: { value: 1.4, measured_epics: 6, assumed: false } })));
    expect(await screen.findByText("No kicked-off milestones with points yet")).toBeInTheDocument();
    expect(milestoneCalls(mock)).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-UI-095 a failed Milestones list: Velocity shows the error with Retry and asks again only on Retry; the Team headline goes without the forecast", async () => {
    let calls = 0;
    const mock = stub(
      undefined,
      () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })),
      () => (++calls === 1 ? json({ error: "gin is down" }, 502) : json(list([entry("m1")], { days_per_point: { value: 1.4, measured_epics: 6, assumed: false } }))),
    );
    open("/reports/velocity?project=alpha&milestone=m2");
    expect(await screen.findByText("gin is down")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Team\s*27 of 64 done, on pace/ })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(milestoneCalls(mock)).toEqual(["/api/milestones?project=alpha"]);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No kicked-off milestones with points yet")).toBeInTheDocument();
    expect(milestoneCalls(mock)).toHaveLength(2);
  });

  it("REQ-UI-095 the row of links reads Status, Team, Delivery, Velocity and Rework, each going to its path with the same query", async () => {
    stub();
    open("/reports/delivery?project=alpha&days=7");
    await screen.findByText("Beads closed");
    const links = within(screen.getByRole("navigation", { name: "Report sections" })).getAllByRole("link");
    const order = ["Status", "Team", "Delivery", "Velocity", "Rework"];
    links.forEach((l, i) => expect(l.textContent?.startsWith(order[i])).toBe(true));
    expect(links.map((l) => l.getAttribute("href"))).toEqual(
      ["status", "team", "delivery", "velocity", "rework"].map((s) => `/reports/${s}?project=alpha&days=7`),
    );
    expect(links[2]).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-093 shows a loading state without headlines", async () => {
    stub(() => new Promise<Response>(() => {}));
    open("/reports/delivery?project=alpha&days=30");
    expect(await screen.findByText("Loading report…")).toBeInTheDocument();
    expect(sectionLink(/^Delivery/)).toHaveAccessibleName("Delivery");
  });

  it("REQ-UI-093 failure: shows the error and retries", async () => {
    let calls = 0;
    const mock = stub(() => (++calls === 1 ? json({ error: "boom" }, 502) : json(report())));
    open("/reports/delivery?project=alpha&days=30");
    expect(await screen.findByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Beads closed")).toBeInTheDocument();
    expect(reportCalls(mock)).toHaveLength(2);
  });

  it("REQ-UI-093 a report answer without errors shows the figures and no warning", async () => {
    stub();
    open("/reports/delivery?project=alpha&days=30");
    expect(await screen.findByText("Beads closed")).toBeInTheDocument();
    expect(screen.queryByText("Some projects could not be read")).not.toBeInTheDocument();
  });

  it("REQ-REPORTS-033 every section shows the scope select, and the page shows no tokens, cost or budget", async () => {
    for (const section of ["status", "team", "delivery", "velocity", "rework"]) {
      stub();
      open(`/reports/${section}?project=alpha&milestone=m2`);
      expect(await scopeSelect()).toHaveDisplayValue("Milestone two");
      expect(screen.getByText("Every report uses")).toBeInTheDocument();
      expect(screen.queryByText(/tokens|cost|budget|gin usage/i)).toBeNull();
      expect(screen.queryByLabelText("Sprint")).toBeNull();
      cleanup();
    }
  });

  it("REQ-REPORTS-033 the Status path shows its panel", async () => {
    stub();
    open("/reports/status?project=alpha&milestone=m2");
    const panel = await screen.findByRole("region", { name: "Status" });
    expect(within(panel).getByRole("heading", { name: "Status" })).toBeInTheDocument();
    expect(sectionLink(/^Status/)).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-093 late answer: drops the answer for a scope no longer selected", async () => {
    let release: (response: Response) => void = () => {};
    stub((url) =>
      url.searchParams.get("days") === "30"
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : json(withClosed(7000)),
    );
    open("/reports/delivery?project=alpha&days=30");
    await userEvent.selectOptions(await scopeSelect(), "Last 7 days");
    expect((await screen.findAllByText("7000")).length).toBeGreaterThan(0);
    release(json(withClosed(9000000)));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getAllByText("7000").length).toBeGreaterThan(0);
    expect(screen.queryByText("9000000")).not.toBeInTheDocument();
  });

  it("REQ-UI-095 team headline: on the Delivery section", async () => {
    stub(undefined, () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })));
    open("/reports/delivery?project=alpha&milestone=m2");
    const link = await screen.findByRole("link", { name: /Team\s*27 of 64 done, on pace/ });
    expect(link.querySelector("svg")).toBeNull();
  });

  it("REQ-MILESTONE-UI-023 behind pace is not late: the headline warns, the Team status does not say late", async () => {
    stub(undefined, () => json(lateTeam({ closed: 27, scope: 64, pace: 3.4, pace_needed: 3.6 })));
    open("/reports/team?project=alpha&milestone=m2");
    const link = await screen.findByRole("link", { name: /Team\s*27 of 64 done, behind pace/ });
    expect(link.querySelector("svg")).not.toBeNull();
    await screen.findByText("working day 9 of 20, 11 left");
    const status = document.querySelector("[data-milestone-status]");
    expect(status).toHaveTextContent(/^Active$/);
    expect(status).not.toHaveTextContent(/late/);
  });

  it("REQ-REPORTS-033 requests the team report whatever the section, for the scope", async () => {
    const mock = stub();
    open("/reports/delivery?project=alpha&days=30");
    await screen.findByText("Beads closed");
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=alpha&days=30"]);
  });

  it("REQ-REPORTS-012 shared link: milestone m1, member ann and the Closed list", async () => {
    const mock = stub();
    open("/reports/team?project=alpha&milestone=m1&member=ann&status=closed");
    await screen.findByText("Closed, 2 d late");
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=alpha&milestone=m1"]);
    expect(at()).toBe("/reports/team?project=alpha&milestone=m1&member=ann&status=closed");
    expect(screen.getByLabelText("Member")).toHaveValue("ann");
    expect(await scopeSelect()).toHaveDisplayValue("Milestone one");
    expect(screen.getByRole("tab", { name: /^Closed/ })).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-REPORTS-012 long options on a phone: the scope and Member selects are capped to their row", async () => {
    stub();
    open("/reports/team?project=alpha&milestone=m1");
    for (const name of ["Report scope", "Member"]) {
      const select = await screen.findByLabelText(name);
      expect(select).toHaveClass("max-w-full", "min-w-0");
      expect(select.closest("label")).toHaveClass("max-w-full", "min-w-0");
    }
  });

  it("REQ-REPORTS-033 Default scope in the URL: the team report's milestone, without a history entry", async () => {
    stub();
    const before = window.history.length;
    open("/reports/status?project=alpha");
    await waitFor(() => expect(at()).toBe("/reports/status?project=alpha&milestone=m2"));
    expect(window.history.length).toBe(before);
  });

  it("REQ-REPORTS-033 a milestone that differs from the team report's is replaced by it", async () => {
    stub(undefined, () => json(teamFixture({ milestone: "m2" })));
    const before = window.history.length;
    open("/reports/team?project=alpha&milestone=gone");
    await waitFor(() => expect(at()).toBe("/reports/team?project=alpha&milestone=m2"));
    expect(window.history.length).toBe(before);
  });

  it("REQ-REPORTS-012 asks once when the default milestone is written to the URL", async () => {
    const mock = stub();
    open("/reports/team?project=alpha");
    await screen.findByLabelText("Member");
    await vi.waitFor(() => expect(window.location.search).toContain("milestone=m2"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=alpha"]);
    expect(screen.getByLabelText("Member")).toBeInTheDocument();
  });

  it("REQ-REPORTS-033 Picking clears the member: a new milestone drops member and status, with a history entry", async () => {
    const mock = stub();
    open("/reports/team?project=alpha&milestone=m2&member=ann&status=closed");
    await screen.findByText("working day 9 of 20, 11 left");
    const before = window.history.length;
    await userEvent.selectOptions(await scopeSelect(), "Milestone one");
    expect(at()).toBe("/reports/team?project=alpha&milestone=m1");
    expect(window.history.length).toBe(before + 1);
    expect(await screen.findByText("Closed, 2 d late")).toBeInTheDocument();
    expect(teamCalls(mock)).toContain("/api/reports/team?project=alpha&milestone=m1");
  });

  it("REQ-REPORTS-012 drops an unknown member", async () => {
    stub();
    open("/reports/team?project=alpha&milestone=m2&member=zed");
    await screen.findByLabelText("Member");
    await vi.waitFor(() => expect(window.location.search).not.toContain("member"));
    expect(screen.getByLabelText("Member")).toHaveValue("");
  });

  it("REQ-REPORTS-017 failure: shows the error and retries", async () => {
    let calls = 0;
    stub(undefined, (url) => (++calls === 1 ? json({ error: "boom" }, 502) : json(teamFor(url))));
    open("/reports/team?project=alpha&milestone=m2");
    expect(await screen.findByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("working day 9 of 20, 11 left")).toBeInTheDocument();
  });

  it("REQ-REPORTS-017 late answer: drops the answer for a milestone no longer selected", async () => {
    let release: (response: Response) => void = () => {};
    stub(undefined, (url) =>
      url.searchParams.get("milestone") === null
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : json(teamFor(url)),
    );
    open("/reports/team?project=alpha");
    act(() => navigate("/reports/team?project=alpha&milestone=m1"));
    expect(await screen.findByText("Closed, 2 d late")).toBeInTheDocument();
    release(json(teamFixture({ milestone: "m2" })));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("Closed, 2 d late")).toBeInTheDocument();
    expect(screen.queryByText("working day 9 of 20, 11 left")).not.toBeInTheDocument();
  });

  it("REQ-REPORTS-033 REQ-REPORTS-017 No milestones: the URL gets days=30, the select lists the three periods and Team shows the last 30 days", async () => {
    const none = { milestones: [], milestone: null, team: null, members: [], days: [], beads: [] };
    const mock = stub(undefined, (url) => json(url.searchParams.get("days") === null ? teamFixture(none) : periodTeam(30, { milestones: [] })));
    const before = window.history.length;
    open("/reports/team?project=beta");
    await waitFor(() => expect(at()).toBe("/reports/team?project=beta&days=30"));
    expect(window.history.length).toBe(before);
    const select = await scopeSelect();
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Last 7 days", "Last 30 days", "Last 90 days"]);
    expect(select).toHaveDisplayValue("Last 30 days");
    expect(await screen.findByRole("heading", { name: /^Last 30 days, / })).toBeInTheDocument();
    expect(screen.queryByText(/has no milestones yet/)).toBeNull();
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=beta", "/api/reports/team?project=beta&days=30"]);
  });

  it("REQ-REPORTS-033 REQ-UI-093 a failed team report shows its error with Retry in the scope select's place, on Velocity too", async () => {
    let calls = 0;
    stub(undefined, (url) => (++calls === 1 ? json({ error: "team down" }, 502) : json(teamFor(url))));
    open("/reports/velocity?project=alpha");
    expect(await screen.findByText("team down")).toBeInTheDocument();
    expect(screen.getByText("The team report could not be loaded")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Report scope" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await scopeSelect()).toHaveDisplayValue("Milestone two");
    await waitFor(() => expect(at()).toBe("/reports/velocity?project=alpha&milestone=m2"));
    expect(screen.queryByText("team down")).toBeNull();
  });

  it("REQ-REPORTS-033 an unlisted milestone: the report is asked for only once the team report confirms a milestone", async () => {
    const mock = stub(
      (url) => (url.searchParams.get("milestone") === "zzz" ? json({ error: "unknown milestone" }, 404) : json(report())),
      () => json(teamFixture({ milestone: "m2" })),
    );
    open("/reports/delivery?project=alpha&milestone=zzz");
    await waitFor(() => expect(at()).toBe("/reports/delivery?project=alpha&milestone=m2"));
    await screen.findByText("Beads closed");
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&milestone=m2"]);
    expect(screen.queryByText("unknown milestone")).toBeNull();
  });

  it("REQ-REPORTS-033 a milestone the team report refuses (422) is dropped for the default scope", async () => {
    const mock = stub(undefined, (url) =>
      url.searchParams.get("milestone") === "a b" ? json({ error: "milestone may hold only letters" }, 422) : json(teamFor(url)),
    );
    const before = window.history.length;
    open("/reports/delivery?project=alpha&milestone=a+b");
    await waitFor(() => expect(at()).toBe("/reports/delivery?project=alpha&milestone=m2"));
    expect(window.history.length).toBe(before);
    await screen.findByText("Beads closed");
    expect(screen.queryByText(/milestone may hold only letters/)).toBeNull();
    expect(reportCalls(mock)).toEqual(["/api/reports?project=alpha&milestone=m2"]);
  });

  it("REQ-UI-095 Hidden links are hinted", async () => {
    const size = (el: HTMLElement, values: Record<string, number>) =>
      Object.entries(values).forEach(([key, value]) => Object.defineProperty(el, key, { configurable: true, writable: true, value }));
    stub();
    open("/reports/delivery?project=alpha&days=30");
    const row = await screen.findByRole("navigation", { name: "Report sections" });
    const fades = () => ({ left: screen.queryByTestId("tabs-fade-left"), right: screen.queryByTestId("tabs-fade-right") });
    // wide window: everything fits
    size(row, { clientWidth: 900, scrollWidth: 900, scrollLeft: 0 });
    fireEvent.resize(window);
    expect(fades().left).toBeNull();
    expect(fades().right).toBeNull();
    // 360px: the right links are hidden
    size(row, { clientWidth: 360, scrollWidth: 900, scrollLeft: 0 });
    fireEvent.resize(window);
    expect(fades().left).toBeNull();
    expect(fades().right).not.toBeNull();
    // scrolled to the end: right fade gone, left shown
    size(row, { scrollLeft: 540 });
    fireEvent.scroll(row);
    expect(fades().right).toBeNull();
    expect(fades().left).not.toBeNull();
  });

  it("REQ-UI-095 fades the right edge when the links widen after the first render", async () => {
    const observed: { target: Element; fire: () => void }[] = [];
    class FakeResizeObserver {
      callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      observe(target: Element) {
        observed.push({ target, fire: this.callback });
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    stub();
    open("/reports/delivery?project=alpha&days=30");
    const row = await screen.findByRole("navigation", { name: "Report sections" });
    const define = (key: string, value: number) => Object.defineProperty(row, key, { configurable: true, writable: true, value });
    define("clientWidth", 700);
    define("scrollWidth", 700);
    define("scrollLeft", 0);
    expect(screen.queryByTestId("tabs-fade-right")).toBeNull();
    // the headlines load: a link widens, the row's own box does not change
    define("scrollWidth", 900);
    const links = observed.filter((o) => o.target.parentElement === row);
    expect(links.length).toBeGreaterThan(0);
    act(() => links[0].fire());
    expect(screen.getByTestId("tabs-fade-right")).toBeInTheDocument();
  });

  it("REQ-UI-095 REQ-UI-129 the row of links hides at lg while the sidebar is expanded, and the sections are published", async () => {
    stub();
    open("/reports/delivery?project=alpha&days=7");
    const row = await screen.findByRole("navigation", { name: "Report sections" });
    expect(row.closest(".lg\\:group-data-\\[sidebar\\=expanded\\]\\/shell\\:hidden")).not.toBeNull();
    const { result } = renderHook(() => useSections());
    await waitFor(() => expect(result.current.sections.find((s) => s.section === "delivery")?.headline).not.toBe(""));
    expect(result.current.selected).toBe("delivery");
    expect(result.current.sections.map((s) => s.section)).toEqual(["status", "team", "delivery", "velocity", "rework"]);
    expect(result.current.sections.find((s) => s.section === "rework")?.href).toBe("/reports/rework?project=alpha&days=7");
  });

  it("REQ-UI-129 clears the sections when the page unmounts", async () => {
    stub();
    window.history.replaceState(null, "", "/reports/status?project=alpha&days=30");
    const view = render(<ReportsPage />);
    await screen.findByRole("navigation", { name: "Report sections" });
    const { result } = renderHook(() => useSections());
    expect(result.current.sections).toHaveLength(5);
    view.unmount();
    expect(result.current.sections).toHaveLength(0);
  });

  it("REQ-UI-063 Reports section: the document title names the section and the project", async () => {
    stub();
    open("/reports/rework?project=alpha&days=30");
    await waitFor(() => expect(document.title).toBe("Reports · Rework · alpha · gin-console"));
  });
});

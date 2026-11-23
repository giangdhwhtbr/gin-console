import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
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
import { teamReport as teamFixture } from "./team/teamFixtures";
import type { TeamReport } from "./teamApi";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const project = (name: string) => ({ name, path: `/x/${name}`, exists: true, beads: null });

const stub = (
  handler: (url: URL) => Response | Promise<Response> = () => json(report()),
  team: (url: URL) => Response | Promise<Response> = () => json(teamFixture()),
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

beforeEach(() => window.history.replaceState(null, "", "/reports"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const teamCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/reports/team"));
const reportCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/reports?"));

beforeEach(() => {
  setFavorite(null);
  rememberProject("alpha");
});

describe("ReportsPage", () => {
  it("REQ-UI-073 remembers its place for the breadcrumb of a bead page", async () => {
    clearOrigin();
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(getOrigin()).toMatchObject({ kind: "reports", path: "/reports", project: "alpha" });
    expect(getOrigin().search).toContain("project=alpha");
  });

  it("REQ-UI-088 opens a shared link", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&days=7&tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(screen.queryByLabelText("Project")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=7");
  });

  it("REQ-UI-088 Old link for all projects is rewritten to the current project", async () => {
    rememberProject("beta");
    window.history.replaceState(null, "", "/reports?project=all&days=7&tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=beta&days=7");
    expect(requested(mock).some((u) => u.includes("project=all"))).toBe(false);
    expect(window.location.search).toBe("?project=beta&days=7&tab=delivery");
    expect(screen.queryByText(/No project all/)).not.toBeInTheDocument();
  });

  it("REQ-UI-088 the current project beats the first one when the URL has none", async () => {
    rememberProject("beta");
    window.history.replaceState(null, "", "/reports?tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=beta&days=30");
  });

  it("REQ-UI-126 an unknown project gets a notice and no report request", async () => {
    window.history.replaceState(null, "", "/reports?project=zzz&tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    expect(await screen.findByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "beta" })).toHaveAttribute("href", "/reports?project=beta");
    expect(reportCalls(mock)).toEqual([]);
    expect(window.location.search).toBe("?project=zzz&tab=delivery");
    expect(screen.queryByLabelText("Project")).not.toBeInTheDocument();
  });

  it("REQ-UI-088 defaults to the current project, writes it into the URL, and changes the period", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=30");
    expect(window.location.search).toBe("?project=alpha&days=30&tab=delivery");
    await userEvent.click(screen.getByRole("button", { name: "90 days" }));
    expect(window.location.search).toBe("?project=alpha&days=90&tab=delivery");
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=90");
  });

  it("REQ-UI-088 filters by sprint", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    await userEvent.type(screen.getByLabelText("Sprint"), "s7{Enter}");
    expect(window.location.search).toBe("?project=alpha&days=30&sprint=s7&tab=delivery");
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=30&sprint=s7");
  });

  it("REQ-UI-088 period kept across tabs", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    stub();
    render(<ReportsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
    await userEvent.click(screen.getByRole("tab", { name: /^Team/ }));
    expect(await screen.findByLabelText("Milestone")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /^Quality/ }));
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-095 opens the tab of a shared link", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&days=7&tab=quality");
    const mock = stub();
    render(<ReportsPage />);
    expect((await screen.findAllByText("Rework rate")).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: /^Quality/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-quality");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=7");
  });

  it("REQ-UI-095 selects Team for an unknown tab", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=nope");
    stub();
    render(<ReportsPage />);
    await screen.findByLabelText("Milestone");
    expect(screen.getByRole("tab", { name: /^Team/ })).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-UI-095 changes tab without a new request", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&days=90&tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    const before = reportCalls(mock).length;
    await userEvent.click(screen.getByRole("tab", { name: /^Quality/ }));
    expect(window.location.search).toBe("?project=alpha&days=90&tab=quality");
    expect((await screen.findAllByText("Rework rate")).length).toBeGreaterThan(0);
    expect(reportCalls(mock)).toHaveLength(before);
  });

  it("REQ-UI-095 shows a headline under each tab", async () => {
    stub();
    render(<ReportsPage />);
    expect(await screen.findByRole("tab", { name: /Delivery\s*4 beads closed/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Quality\s*25% rework/ })).toBeInTheDocument();
  });

  it("REQ-UI-095 quality headline reads a dash without a rate", async () => {
    stub(() => json(report({ totals: { closed: 0, rework_rate: null } })));
    render(<ReportsPage />);
    expect(await screen.findByRole("tab", { name: /Quality\s*— rework/ })).toBeInTheDocument();
  });

  it("REQ-UI-095 shows no headline after a failed load", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    stub(() => json({ error: "boom" }, 502));
    render(<ReportsPage />);
    await screen.findByText("boom");
    for (const name of ["Delivery", "Quality"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
  });

  it("REQ-UI-095 keeps the sprint across a tab change", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&days=30&sprint=s7&tab=delivery");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    await userEvent.click(screen.getByRole("tab", { name: /^Quality/ }));
    expect(window.location.search).toBe("?project=alpha&days=30&sprint=s7&tab=quality");
    expect(screen.getByLabelText("Sprint")).toHaveValue("s7");
  });

  it("REQ-UI-095 velocity tab shows the headline of the list the page already asked for, once", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    await userEvent.click(screen.getByRole("tab", { name: /^Velocity/ }));
    expect(window.location.search).toContain("tab=velocity");
    expect(await screen.findByRole("tab", { name: /^Velocity.*1\.4 days per point/ })).toBeTruthy();
    expect(requested(mock).filter((u) => u.startsWith("/api/milestones"))).toEqual(["/api/milestones?project=alpha"]);
    expect(screen.queryByLabelText("Sprint")).toBeNull();
  });

  it("REQ-UI-095 requests the Milestones list once for a project when switching Team, Delivery and Velocity", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("working day 9 of 20, 11 left");
    await userEvent.click(screen.getByRole("tab", { name: /^Delivery/ }));
    await screen.findByText("Beads closed");
    await userEvent.click(screen.getByRole("tab", { name: /^Velocity/ }));
    expect(await screen.findByText("1.4 days per point", { selector: "dd" })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: /^Team/ }));
    await screen.findByText("working day 9 of 20, 11 left");
    expect(requested(mock).filter((u) => u.startsWith("/api/milestones"))).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-UI-095 opening Velocity first still requests the Milestones list once", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=velocity");
    const mock = stub();
    render(<ReportsPage />);
    expect(await screen.findByRole("tab", { name: /^Velocity.*1\.4 days per point/ })).toBeTruthy();
    await screen.findByText("No kicked-off milestones with points yet");
    expect(requested(mock).filter((u) => u.startsWith("/api/milestones"))).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-UI-095 late milestone headline: the forecast of the selected milestone, with a warning icon", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub(
      undefined,
      () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })),
      () => json(list([entry("m2", { status: "active", start: "2026-11-02", end: "2026-11-27", finish: "2027-02-16" })], { today: "2026-11-12" })),
    );
    render(<ReportsPage />);
    const tab = await screen.findByRole("tab", { name: /Team\s*27 of 64 done, late/ });
    expect(tab.querySelector("svg")).not.toBeNull();
  });

  it("REQ-UI-095 the Team headline applies the rule without the forecast while the list loads or after it failed", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub(undefined, () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })), () => json({ error: "gin is down" }, 502));
    render(<ReportsPage />);
    expect(await screen.findByRole("tab", { name: /Team\s*27 of 64 done, on pace/ })).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 late active milestone: the Team chip reads Active, late once the list has the forecast", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    stub(
      undefined,
      undefined,
      () => json(list([entry("m2", { status: "active", start: "2026-11-02", end: "2026-11-27", finish: "2027-02-16" })], { today: "2026-11-12" })),
    );
    render(<ReportsPage />);
    await screen.findByText("working day 9 of 20, 11 left");
    await vi.waitFor(() => expect(document.querySelector("[data-milestone-status]")).toHaveTextContent("Active, late"));
  });

  it("REQ-UI-095 Velocity says Loading velocity… while the page's Milestones request is open", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=velocity");
    let release: (response: Response) => void = () => {};
    const mock = stub(undefined, undefined, () => new Promise<Response>((resolve) => { release = resolve; }));
    render(<ReportsPage />);
    expect(await screen.findByText("Loading velocity…")).toBeInTheDocument();
    release(json(list([entry("m1")], { days_per_point: { value: 1.4, measured_epics: 6, assumed: false } })));
    expect(await screen.findByText("No kicked-off milestones with points yet")).toBeInTheDocument();
    expect(requested(mock).filter((u) => u.startsWith("/api/milestones"))).toEqual(["/api/milestones?project=alpha"]);
  });

  it("REQ-UI-095 a failed Milestones list: Velocity shows the error with Retry and asks again only on Retry; the Team headline goes without the forecast", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=velocity");
    let calls = 0;
    const mock = stub(
      undefined,
      () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })),
      () => (++calls === 1 ? json({ error: "gin is down" }, 502) : json(list([entry("m1")], { days_per_point: { value: 1.4, measured_epics: 6, assumed: false } }))),
    );
    render(<ReportsPage />);
    expect(await screen.findByText("gin is down")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Team\s*27 of 64 done, on pace/ })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(requested(mock).filter((u) => u.startsWith("/api/milestones"))).toEqual(["/api/milestones?project=alpha"]);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No kicked-off milestones with points yet")).toBeInTheDocument();
    expect(requested(mock).filter((u) => u.startsWith("/api/milestones"))).toHaveLength(2);
  });

  it("REQ-UI-095 tab order puts Velocity after Delivery", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    const order = ["Team", "Delivery", "Velocity", "Quality"];
    screen.getAllByRole("tab").forEach((t, i) => expect(t.textContent?.startsWith(order[i])).toBe(true));
    expect(screen.getAllByRole("tab")).toHaveLength(order.length);
  });

  it("REQ-UI-095 moves between tabs with the arrow keys", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    screen.getByRole("tab", { name: /^Delivery/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    const velocity = screen.getByRole("tab", { name: /^Velocity/ });
    expect(velocity).toHaveAttribute("aria-selected", "true");
    expect(velocity).toHaveFocus();
    expect(window.location.search).toContain("tab=velocity");
    await userEvent.keyboard("{ArrowRight}");
    const quality = screen.getByRole("tab", { name: /^Quality/ });
    expect(quality).toHaveAttribute("aria-selected", "true");
    expect(quality).toHaveFocus();
    expect(window.location.search).toContain("tab=quality");
  });

  it("REQ-UI-093 shows a loading state without headlines", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    stub(() => new Promise<Response>(() => {}));
    render(<ReportsPage />);
    expect(await screen.findByText("Loading report…")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Delivery" })).toBeInTheDocument();
  });

  it("REQ-UI-093 shows an error and retries", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    let calls = 0;
    const mock = stub(() => (++calls === 1 ? json({ error: "boom" }, 502) : json(report())));
    render(<ReportsPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Beads closed")).toBeInTheDocument();
    expect(reportCalls(mock)).toHaveLength(2);
  });

  it("REQ-UI-093 a report answer without errors shows the figures and no warning", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub();
    render(<ReportsPage />);
    expect(await screen.findByText("Beads closed")).toBeInTheDocument();
    expect(screen.queryByText("Some projects could not be read")).not.toBeInTheDocument();
  });

  it("REQ-UI-095 a retired tab link selects Team", async () => {
    for (const tab of ["usage", "coverage"]) {
      window.history.replaceState(null, "", `/reports?project=alpha&tab=${tab}`);
      stub();
      render(<ReportsPage />);
      await screen.findByLabelText("Milestone");
      expect(screen.getByRole("tab", { name: /^Team/ })).toHaveAttribute("aria-selected", "true");
      cleanup();
    }
  });

  it("REQ-UI-088 the period choice shows on Delivery and Quality, not on Team", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=quality");
    stub();
    render(<ReportsPage />);
    expect(await screen.findByRole("button", { name: "7 days" })).toBeInTheDocument();
    expect(screen.queryByText(/tokens|cost|budget|gin usage/i)).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /^Team/ }));
    await screen.findByLabelText("Milestone");
    expect(screen.queryByRole("button", { name: "7 days" })).toBeNull();
  });

  it("REQ-UI-093 drops a late answer", async () => {
    window.history.replaceState(null, "", "/reports?tab=delivery");
    let release: (response: Response) => void = () => {};
    stub((url) =>
      url.searchParams.get("days") === "30"
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : json(withClosed(7000)),
    );
    render(<ReportsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
    expect((await screen.findAllByText("7000")).length).toBeGreaterThan(0);
    release(json(withClosed(9000000)));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getAllByText("7000").length).toBeGreaterThan(0);
    expect(screen.queryByText("9000000")).not.toBeInTheDocument();
  });

  const lateTeam = (over: Partial<TeamReport["team"] & object>): TeamReport => {
    const base = teamFixture();
    return teamFixture({ team: base.team === null ? null : { ...base.team, ...over } });
  };

  it("REQ-UI-095 headline under Team", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub(undefined, () => json(lateTeam({ closed: 27, scope: 64, pace: 3.6, pace_needed: 3.4 })));
    render(<ReportsPage />);
    expect(await screen.findByRole("tab", { name: /Team\s*27 of 64 done, on pace/ })).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-023 behind pace is not late: the headline warns, the Team chip does not say late", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    stub(undefined, () => json(lateTeam({ closed: 27, scope: 64, pace: 3.4, pace_needed: 3.6 })));
    render(<ReportsPage />);
    const tab = await screen.findByRole("tab", { name: /Team\s*27 of 64 done, behind pace/ });
    expect(tab.querySelector("svg")).not.toBeNull();
    await screen.findByText("working day 9 of 20, 11 left");
    const chip = document.querySelector("[data-milestone-status]");
    expect(chip).toHaveTextContent(/^Active$/);
    expect(chip).not.toHaveTextContent(/late/);
  });

  it("REQ-UI-095 requests the team report on any tab for a single project", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=alpha"]);
  });

  it("REQ-REPORTS-012 opens a shared link", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team&milestone=m1&member=ann&status=closed");
    const mock = stub(undefined, () => json(teamFixture({ milestone: "m1" })));
    render(<ReportsPage />);
    await screen.findByLabelText("Milestone");
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=alpha&milestone=m1"]);
    expect(window.location.search).toBe("?project=alpha&tab=team&milestone=m1&member=ann&status=closed");
    expect(screen.getByLabelText("Member")).toHaveValue("ann");
  });

  it("REQ-REPORTS-012 long options on a phone: the Milestone and Member selects are capped to their row", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team&milestone=m1");
    stub(undefined, () => json(teamFixture({ milestone: "m1" })));
    render(<ReportsPage />);
    for (const name of ["Milestone", "Member"]) {
      const select = await screen.findByLabelText(name);
      expect(select).toHaveClass("max-w-full", "min-w-0");
      expect(select.closest("label")).toHaveClass("max-w-full", "min-w-0");
    }
  });

  it("REQ-REPORTS-012 writes the default milestone into the URL", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    stub();
    render(<ReportsPage />);
    await screen.findByLabelText("Milestone");
    expect(window.location.pathname + window.location.search).toBe("/reports?project=alpha&days=30&tab=team&milestone=m2");
  });

  it("REQ-REPORTS-012 asks once when the default milestone is written to the URL", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByLabelText("Milestone");
    await vi.waitFor(() => expect(window.location.search).toContain("milestone=m2"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(teamCalls(mock)).toEqual(["/api/reports/team?project=alpha"]);
    expect(screen.getByLabelText("Milestone")).toBeInTheDocument();
  });

  it("REQ-REPORTS-012 change milestone requests the new team report", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team&milestone=m2&member=ann&status=closed");
    const mock = stub(undefined, (url) => json(teamFixture({ milestone: url.searchParams.get("milestone") ?? "m2" })));
    render(<ReportsPage />);
    await userEvent.selectOptions(await screen.findByLabelText("Milestone"), "m1");
    expect(await screen.findByText("Closed, 2 d late")).toBeInTheDocument();
    expect(teamCalls(mock)).toContain("/api/reports/team?project=alpha&milestone=m1");
    expect(window.location.search).toBe("?project=alpha&days=30&tab=team&milestone=m1");
  });

  it("REQ-REPORTS-012 leaves the milestone out of the URL on other tabs", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(window.location.search).not.toContain("milestone");
  });

  it("REQ-REPORTS-012 drops an unknown member", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team&milestone=m2&member=zed");
    stub();
    render(<ReportsPage />);
    await screen.findByLabelText("Milestone");
    await vi.waitFor(() => expect(window.location.search).not.toContain("member"));
    expect(screen.getByLabelText("Member")).toHaveValue("");
  });

  it("REQ-REPORTS-017 shows a failure and retries", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    let calls = 0;
    stub(undefined, () => (++calls === 1 ? json({ error: "boom" }, 502) : json(teamFixture())));
    render(<ReportsPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("working day 9 of 20, 11 left")).toBeInTheDocument();
  });

  it("REQ-REPORTS-017 drops a late answer", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=team");
    let release: (response: Response) => void = () => {};
    stub(undefined, (url) =>
      url.searchParams.get("milestone") === null
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : json(teamFixture({ milestone: url.searchParams.get("milestone") })),
    );
    render(<ReportsPage />);
    act(() => navigate("/reports?project=alpha&tab=team&milestone=m1"));
    expect(await screen.findByText("Closed, 2 d late")).toBeInTheDocument();
    release(json(teamFixture({ milestone: "m2" })));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("Closed, 2 d late")).toBeInTheDocument();
    expect(screen.queryByText("working day 9 of 20, 11 left")).not.toBeInTheDocument();
  });

  it("REQ-UI-095 Hidden tabs are hinted", async () => {
    const size = (el: HTMLElement, values: Record<string, number>) =>
      Object.entries(values).forEach(([key, value]) => Object.defineProperty(el, key, { configurable: true, writable: true, value }));
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub();
    render(<ReportsPage />);
    const list = await screen.findByRole("tablist", { name: "Report" });
    const fades = () => ({ left: screen.queryByTestId("tabs-fade-left"), right: screen.queryByTestId("tabs-fade-right") });
    // wide window: everything fits
    size(list, { clientWidth: 900, scrollWidth: 900, scrollLeft: 0 });
    fireEvent.resize(window);
    expect(fades().left).toBeNull();
    expect(fades().right).toBeNull();
    // 768px: the right tabs are hidden
    size(list, { clientWidth: 700, scrollWidth: 900, scrollLeft: 0 });
    fireEvent.resize(window);
    expect(fades().left).toBeNull();
    expect(fades().right).not.toBeNull();
    // scrolled to the end: right fade gone, left shown
    size(list, { scrollLeft: 200 });
    fireEvent.scroll(list);
    expect(fades().right).toBeNull();
    expect(fades().left).not.toBeNull();
  });

  it("REQ-UI-095 fades the right edge when the tabs widen after the first render", async () => {
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
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery");
    stub();
    render(<ReportsPage />);
    const list = await screen.findByRole("tablist", { name: "Report" });
    const define = (key: string, value: number) => Object.defineProperty(list, key, { configurable: true, writable: true, value });
    define("clientWidth", 700);
    define("scrollWidth", 700);
    define("scrollLeft", 0);
    expect(screen.queryByTestId("tabs-fade-right")).toBeNull();
    // the headlines load: a tab widens, the list's own box does not change
    define("scrollWidth", 900);
    const tabs = observed.filter((o) => o.target.parentElement === list);
    expect(tabs.length).toBeGreaterThan(0);
    act(() => tabs[0].fire());
    expect(screen.getByTestId("tabs-fade-right")).toBeInTheDocument();
  });

  it("REQ-UI-095 REQ-UI-129 the tab strip hides at lg while the sidebar is expanded, and the sections are published", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=delivery&days=7");
    stub();
    render(<ReportsPage />);
    const list = await screen.findByRole("tablist", { name: "Report" });
    expect(list.closest(".lg\\:group-data-\\[sidebar\\=expanded\\]\\/shell\\:hidden")).not.toBeNull();
    const { result } = renderHook(() => useSections());
    await waitFor(() => expect(result.current.sections.find((s) => s.tab === "delivery")?.headline).not.toBe(""));
    expect(result.current.selected).toBe("delivery");
    expect(result.current.sections.map((s) => s.tab)).toEqual(["team", "delivery", "velocity", "quality"]);
    const quality = result.current.sections.find((s) => s.tab === "quality");
    expect(new URLSearchParams(quality?.href.split("?")[1]).get("tab")).toBe("quality");
    expect(quality?.href).toContain("project=alpha");
    expect(quality?.href).toContain("days=7");
  });

  it("REQ-UI-129 clears the sections when the page unmounts", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha");
    stub();
    const view = render(<ReportsPage />);
    await screen.findByRole("tablist", { name: "Report" });
    const { result } = renderHook(() => useSections());
    expect(result.current.sections).toHaveLength(4);
    view.unmount();
    expect(result.current.sections).toHaveLength(0);
  });
});

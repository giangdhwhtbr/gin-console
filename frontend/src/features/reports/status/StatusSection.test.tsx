import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { detail, entry, epicPlan, list } from "@/features/milestones/milestoneFixtures";
import { StatusSection } from "./StatusSection";
import { statusEpic, statusKpis, statusMilestones, statusReport } from "./statusFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubDetail = (handler: () => Response | Promise<Response> = () => json(detail([]))) => {
  const mock = vi.fn(() => Promise.resolve(handler()));
  vi.stubGlobal("fetch", mock);
  return mock;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("StatusSection", () => {
  it("REQ-REPORTS-028 Active milestone: heading, subtitle and At risk verdict panel with dashed ring and warning wash", async () => {
    stubDetail(() => json(detail([epicPlan("e-1")])));
    const report = statusReport({
      kpis: statusKpis({
        beads: { done: 15, scope: 35, done_week_ago: 7, scope_week_ago: 32 },
        pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.4 },
        blocked: { count: 1, oldest_days: 4 },
      }),
    });
    const ml = list([entry("m2", { finish: "2026-11-30" })]);
    const { container } = render(<StatusSection project="example" report={report} list={ml} />);

    expect(screen.getByRole("heading", { name: "Checkout v2" })).toBeInTheDocument();
    expect(screen.getByText("Milestone report, 11 Nov – 2 Dec. Working day 8 of 16.")).toBeInTheDocument();
    const verdictPanel = container.querySelector("[data-verdict-tone='risk']");
    expect(verdictPanel).not.toBeNull();
    expect(verdictPanel).toHaveAttribute("data-verdict-wash", "true");
    expect(verdictPanel).toHaveClass("bg-state-blocked/10");
    expect(within(verdictPanel as HTMLElement).getByText("At risk")).toHaveClass("text-state-blocked");
    expect(verdictPanel?.querySelector("[data-glyph='deferred']")).not.toBeNull();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Epics" })).toBeInTheDocument());
  });

  it("REQ-REPORTS-028 Figures with their change: 5 figures and warning colours on 2nd, 3rd and 5th change lines", () => {
    stubDetail();
    const report = statusReport({
      kpis: {
        beads: { done: 13, scope: 35, done_week_ago: 7, scope_week_ago: 32 },
        points: { done: 0, scope: 27, at_kickoff: 24, done_week_ago: 0 },
        pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.4 },
        blocked: { count: 2, oldest_days: 4 },
        rework: { rate: 0.31, rate_week_ago: 0.18 },
      },
    });
    render(<StatusSection project="example" report={report} list={null} />);

    expect(screen.getByText("13 of 35")).toBeInTheDocument();
    expect(screen.getByText("+6 this week")).not.toHaveClass("text-state-blocked");
    expect(screen.getByText("0 of 27")).toBeInTheDocument();
    expect(screen.getByText("+3 added after kickoff")).toHaveClass("text-state-blocked");
    expect(screen.getByText("2.0 a day")).toBeInTheDocument();
    expect(screen.getByText("needs 2.8 to end on 2 Dec")).toHaveClass("text-state-blocked");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("oldest waiting 4 days")).not.toHaveClass("text-state-blocked");
    expect(screen.getByText("31%")).toBeInTheDocument();
    expect(screen.getByText("up from 18% last week")).toHaveClass("text-state-blocked");
    // 5 in a row at lg, 2 below lg, 1 below 640px
    const group = screen.getByRole("group", { name: "Key figures" });
    expect(group).toHaveClass("grid-cols-1", "sm:grid-cols-2", "lg:grid-cols-5");
  });

  it("REQ-REPORTS-028 No change line before a week", () => {
    stubDetail();
    const report = statusReport({
      kpis: {
        beads: { done: 5, scope: 20, done_week_ago: null, scope_week_ago: null },
        points: { done: 4, scope: 24, at_kickoff: 24, done_week_ago: null },
        pace: { pace: 1.5, pace_needed: null, pace_week_ago: null },
        blocked: { count: 0, oldest_days: null },
        rework: { rate: 0.1, rate_week_ago: null },
      },
    });
    render(<StatusSection project="example" report={report} list={null} />);
    expect(screen.queryByText(/this week|last week/)).toBeNull();
    expect(screen.getByText("scope unchanged since kickoff")).toBeInTheDocument();
    expect(screen.getByText("nothing blocked")).toBeInTheDocument();
  });

  it("REQ-REPORTS-030 Changes: lists bug_added, epic_added and re_estimated with bead links and Show all", async () => {
    stubDetail();
    const extra = Array.from({ length: 7 }, (_, i) => ({
      day: "2026-11-15",
      kind: "estimated" as const,
      id: `e-x-${i}`,
      title: `Extra ${i}`,
      points: null,
      from: null,
      to: 3,
      epic: null,
      person: null,
    }));
    const report = statusReport({
      changes: {
        scope_from: 24,
        scope_to: 27,
        items: [
          {
            day: "2026-11-18",
            kind: "bug_added",
            id: "b-1",
            title: "total shows NaN for empty cart",
            points: null,
            from: null,
            to: null,
            epic: { id: "e-2", title: "Payment page" },
            person: "chi",
          },
          {
            day: "2026-11-18",
            kind: "epic_added",
            id: "e-4",
            title: "Gift cards",
            points: 3,
            from: null,
            to: null,
            epic: null,
            person: null,
          },
          {
            day: "2026-11-16",
            kind: "re_estimated",
            id: "e-2",
            title: "Payment page",
            points: null,
            from: 5,
            to: 8,
            epic: null,
            person: null,
          },
          ...extra,
        ],
      },
    });
    render(<StatusSection project="example" report={report} list={null} />);

    const changesPanel = screen.getByRole("heading", { name: "Changed since kickoff" }).closest("section") as HTMLElement;
    const panel = within(changesPanel);
    expect(panel.getByText("Scope 24 → 27 points")).toBeInTheDocument();
    expect(panel.getByRole("link", { name: "total shows NaN for empty cart" })).toHaveAttribute("href", "/beads/example/b-1");
    expect(panel.getByText(/Added 18 Nov under/)).toBeInTheDocument();
    expect(panel.getByRole("link", { name: "Gift cards" })).toHaveAttribute("href", "/beads/example/e-4");
    expect(panel.getByText(/added with 3 points/)).toBeInTheDocument();
    expect(panel.getByText(/re-estimated from 5 to 8 points/)).toBeInTheDocument();
    expect(panel.getByText("16 Nov")).toBeInTheDocument();

    // Only first 8 shown initially; Show all 10 reveals the rest
    expect(panel.queryByText("Extra 6")).toBeNull();
    await userEvent.click(panel.getByRole("button", { name: "Show all 10" }));
    expect(panel.getByText("Extra 6")).toBeInTheDocument();
  });

  it("REQ-REPORTS-030 Risks: blocked chain, unestimated epics and unconfirmed specs", async () => {
    const unconfirmedEpics = Array.from({ length: 8 }, (_, i) =>
      epicPlan(`e-${i + 1}`, { title: `Spec epic ${i + 1}`, spec_confirmed: false }),
    );
    stubDetail(() => json(detail(unconfirmedEpics)));
    const report = statusReport({
      risks: {
        blocked: [
          {
            id: "t-3",
            title: "End-to-end checkout QA",
            days: 4,
            blocker: { id: "t-8", title: "Mobile layout", person: "bao", blocked: true },
          },
        ],
        blocked_more: 2,
        unestimated: [
          { id: "u-1", title: "Team checkout" },
          { id: "u-2", title: "Saved payment methods" },
          { id: "u-3", title: "Loyalty points" },
          { id: "u-4", title: "Receipts" },
        ],
      },
    });
    render(<StatusSection project="example" report={report} list={null} />);

    expect(screen.getByRole("link", { name: "End-to-end checkout QA" })).toHaveAttribute("href", "/beads/example/t-3");
    expect(screen.getByRole("link", { name: "Mobile layout" })).toHaveAttribute("href", "/beads/example/t-8");
    expect(screen.getByText("Mobile layout is blocked too, bao, 4 days")).toBeInTheDocument();
    expect(screen.getByText("2 more blocked beads")).toBeInTheDocument();
    expect(screen.getByText("4 epics have no estimate")).toBeInTheDocument();
    expect(screen.getByText(/1 more/)).toBeInTheDocument();
    expect(await screen.findByText("8 of 8 epics: spec not approved yet")).toBeInTheDocument();
  });

  it("REQ-REPORTS-030 Nothing to show: empty changes, empty risks and all specs confirmed", async () => {
    stubDetail(() => json(detail([epicPlan("e-1", { spec_confirmed: true })])));
    const report = statusReport({
      changes: { scope_from: 24, scope_to: 24, items: [] },
      risks: { blocked: [], blocked_more: 0, unestimated: [] },
    });
    render(<StatusSection project="example" report={report} list={null} />);
    expect(screen.getByText("No changes since kickoff")).toBeInTheDocument();
    expect(await screen.findByText("No risks found")).toBeInTheDocument();
  });

  it("REQ-REPORTS-032 Not started: shows Not started verdict and Starts 18 Dec in place of burn-up", () => {
    stubDetail();
    const report = statusReport({
      milestone: "m3",
      milestones: statusMilestones,
      burnup: [],
      period: null,
      epics: [statusEpic("e-8", { points: 13 })],
      kpis: statusKpis({ points: { done: null, scope: null, at_kickoff: null, done_week_ago: null } }),
    });
    render(<StatusSection project="example" report={report} list={null} />);
    expect(screen.getByText("Not started")).toBeInTheDocument();
    expect(screen.getByText("Starts 18 Dec")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Burn-up" })).toBeNull();
  });

  it("REQ-REPORTS-032 empty epics shows No epics in this milestone yet in place of burn-up and table", () => {
    stubDetail();
    const report = statusReport({ burnup: [], epics: [] });
    render(<StatusSection project="example" report={report} list={null} />);
    expect(screen.getByText("No epics in this milestone yet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Burn-up" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Epics" })).toBeNull();
  });

  it("REQ-REPORTS-032 detail failure still renders the rest of the section without spec line, and keeps narrow layout safe at 390px", async () => {
    stubDetail(() => json({ error: "gin down" }, 502));
    const longTitle = "Very long epic title that should truncate cleanly without causing any horizontal page overflow on a 390px phone viewport";
    const report = statusReport({
      epics: [statusEpic("e-1", { title: longTitle })],
    });
    const { container } = render(<StatusSection project="example" report={report} list={null} />);
    expect(await screen.findByRole("link", { name: longTitle })).toHaveClass("truncate");
    expect(screen.queryByText(/spec not approved yet/)).toBeNull();
    expect(container.firstElementChild).toHaveClass("min-w-0");
  });
});

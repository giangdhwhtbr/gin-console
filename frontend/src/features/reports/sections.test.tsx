import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliverySection as Delivery, QualityRow, Report } from "./api";
import { CoverageSection } from "./CoverageSection";
import { DeliverySection } from "./DeliverySection";
import { QualitySection } from "./QualitySection";
import { report } from "./reportFixtures";
import { UsageSection } from "./UsageSection";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const usageOf = (r: Report) => <UsageSection usage={r.usage} project={r.project} />;

describe("report sections", () => {
  it("REQ-UI-089 member bars carry each member's figures", () => {
    const base = report();
    const m = base.usage.members[0];
    const r = report({
      usage: {
        ...base.usage,
        members: [
          { ...m, member: "ann", stages: { execute: 30, review: 10 } },
          { ...m, member: "Unassigned", closed: 1, tokens: 50, cost: null, tokens_per_bead: 50, cache_ratio: null, stages: { execute: 5 } },
        ],
      },
    });
    render(usageOf(r));
    expect(screen.getByLabelText("ann: 4 beads closed, 51.1M tokens, $12.34 estimated, 12.8M tokens per bead, 90% cache reads")).toHaveAttribute("tabindex", "0");
    expect(screen.getByLabelText(/^Unassigned: 1 beads closed, 50 tokens, no price estimated/)).toBeTruthy();
    expect(screen.getByText("execute")).toBeTruthy();
    expect(screen.getByText("review")).toBeTruthy();
  });

  it("REQ-UI-089 epic budget meter, no budget, no price; top beads listed", () => {
    const base = report();
    const e = base.usage.epics[0];
    const r = report({
      usage: {
        ...base.usage,
        epics: [
          { ...e, id: "a-1", title: "Over", children: 4, closed_children: 3, budget: { budget_usd: 10, cost: 11.7, status: "over" } },
          { ...e, id: "a-2", title: "Free", budget: null },
          { ...e, id: "a-3", title: "Unpriced", budget: { budget_usd: 10, cost: null, status: "ok" } },
        ],
      },
    });
    render(usageOf(r));
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "117");
    expect(screen.getByText("117%")).toHaveClass("text-state-blocked");
    expect(screen.getByRole("link", { name: /Over/ }).getAttribute("href")).toBe("/beads/alpha/a-1");
    expect(screen.getByText("3/4")).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /a-2 — Free/ })).getByText("No budget")).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /a-3 — Unpriced/ })).getByText("no price")).toBeTruthy();
    expect(screen.getByText(/a-2 — Bead two/)).toBeTruthy();
  });

  it("REQ-UI-089 stage share as text; model table", () => {
    render(usageOf(report()));
    expect(screen.getByText("implement 78%, review 22%")).toBeTruthy();
    expect(screen.getByRole("row", { name: /opus developer 10 \$1\.00/ })).toBeTruthy();
  });

  it("REQ-UI-090 delivery: weeks, ranges by type and member, no work in progress", () => {
    const base = report();
    const d: Delivery = {
      ...base.delivery,
      weeks: [
        { week: "2026-W43", counts: { task: 1, bug: 2 } },
        { week: "2026-W44", counts: { task: 3 } },
      ],
      by_type: [{ key: "task", cycle: { n: 3, median: 2, p85: 4 }, lead: null }],
      by_member: [{ key: "ann", cycle: { n: 3, median: 1.5, p85: 4 }, lead: { n: 3, median: 5, p85: 6 } }],
    };
    const { container } = render(<DeliverySection delivery={d} />);
    expect(container.querySelectorAll(".recharts-bar").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("task: 3 beads, median 2.0 d, 85th percentile 4.0 d")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "By member" }));
    expect(screen.getByRole("button", { name: "By member" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("ann: 3 beads, median 1.5 d, 85th percentile 4.0 d")).toBeTruthy();
    expect(screen.getByLabelText("ann: 3 beads, median 5.0 d, 85th percentile 6.0 d")).toBeTruthy();
    expect(screen.queryByText("Oldest in progress")).toBeNull();
    expect(screen.queryByText("In progress by member")).toBeNull();
    expect(screen.queryByText("Estimate and actual")).toBeNull();
  });

  it("REQ-UI-090 estimate table with difference chips", () => {
    const base = report();
    const est = (id: string, actual: number) => ({ project: "alpha", id, title: id, estimate_days: 5, actual_days: actual });
    render(<DeliverySection delivery={{ ...base.delivery, estimates: [est("e-1", 7), est("e-2", 3)] }} />);
    expect(screen.getByText("Estimate and actual")).toBeTruthy();
    expect(screen.getByText("+2 d")).toHaveClass("text-state-blocked");
    expect(screen.getByText("−2 d")).not.toHaveClass("text-state-blocked");
  });

  const qrow = (key: string, over: Partial<QualityRow> = {}): QualityRow => ({
    key, project: null, title: null, beads: 1, reopens: 0, bugs: 0, review_cycles: 0, rejections: 0, waivers: 0,
    findings: { critical: 0, important: 0, minor: 0, suggestion: 0 }, rework_rate: 0, ...over,
  });

  it("REQ-UI-091 clicking a point opens its bead page", () => {
    const r = report({ quality: { members: [], epics: [], points: [{ project: "alpha", id: "a-3", title: "T", tokens: 100, rework: 2 }] } });
    const { container } = render(<QualitySection quality={r.quality} />);
    const symbol = container.querySelector(".recharts-scatter-symbol");
    expect(symbol).not.toBeNull();
    fireEvent.click(symbol?.firstElementChild ?? symbol ?? container);
    expect(window.location.pathname).toBe("/beads/alpha/a-3");
  });

  it("REQ-UI-091 two point colors with a legend, member table and findings", () => {
    const points = [
      { project: "alpha", id: "a-1", title: "Clean", tokens: 100, rework: 0 },
      { project: "alpha", id: "a-2", title: "Reworked", tokens: 200, rework: 1 },
    ];
    const members = [
      qrow("ann", { beads: 4, reopens: 1, review_cycles: 5, rework_rate: 0.25, findings: { critical: 1, important: 2, minor: 0, suggestion: 3 }, waivers: 1 }),
      qrow("bao", { beads: 1, bugs: 1, review_cycles: 1, findings: { critical: 0, important: 1, minor: 4, suggestion: 0 } }),
    ];
    const { container } = render(<QualitySection quality={{ members, epics: [], points }} />);
    const legend = container.querySelector(".recharts-legend-wrapper");
    expect(legend?.textContent).toContain("No rework");
    expect(legend?.textContent).toContain("Some rework");
    expect(screen.getByRole("row", { name: /ann 1 0 1\.3 0 25%/ })).toBeTruthy();
    const findings = screen.getByRole("region", { name: "Review findings" });
    expect(within(findings).getByText("Critical").nextElementSibling?.textContent).toBe("1");
    expect(within(findings).getByText("Important").nextElementSibling?.textContent).toBe("3");
    expect(within(findings).getByText("Minor").nextElementSibling?.textContent).toBe("4");
    expect(within(findings).getByText("Waivers").nextElementSibling?.textContent).toBe("1");
    expect(screen.queryByText("By epic")).toBeNull();
  });

  it("REQ-UI-093 member rows without points still show the table and no chart", () => {
    const { container } = render(<QualitySection quality={{ members: [qrow("ann")], epics: [], points: [] }} />);
    expect(screen.getByText("ann")).toBeTruthy();
    expect(screen.queryByText("No data in this period")).toBeNull();
    expect(container.querySelector(".recharts-surface")).toBeNull();
  });

  it("REQ-UI-092 coverage blocks with counts, copy command, unassigned share and fixed note", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const coverage = {
      not_collected: [{ project: "alpha", id: "a-9", title: "t", detail: "gin usage collect --bead a-9" }],
      invalid: [],
      unpriced: ["m1", "m2"],
      unassigned_share: 0.25,
      sources: [{ project: "alpha", id: "a-5", title: "x", sources: { claude: "missing", codex: "ok" }, skipped_lines: 3 }],
    };
    render(<CoverageSection coverage={coverage} errors={[{ project: "beta", error: "boom" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("gin usage collect --bead a-9");
    expect(screen.getByRole("link", { name: "a-9" }).getAttribute("href")).toBe("/beads/alpha/a-9");
    expect(screen.getByRole("heading", { name: "Not collected 1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Unreadable usage 0" })).toBeTruthy();
    expect(screen.getByText("Every AI usage record is readable.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Models without a price 2" })).toBeTruthy();
    expect(screen.getByText("m1")).toBeTruthy();
    expect(screen.getByText(/a-5, claude: missing, skipped lines: 3/)).toBeTruthy();
    expect(screen.getByText("beta: boom")).toBeTruthy();
    expect(screen.getByText("25% of tokens have no assignee and show under Unassigned.")).toBeTruthy();
    expect(
      screen.getByText("Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured."),
    ).toBeTruthy();
  });

  it("REQ-UI-092 a block with no gap says so", () => {
    render(<CoverageSection coverage={report().coverage} errors={[]} />);
    expect(screen.getByRole("heading", { name: "Projects that failed 0" })).toBeTruthy();
    expect(screen.getByText("Every project answered.")).toBeTruthy();
    expect(screen.queryByText(/of tokens have no assignee/)).toBeNull();
  });

  it("REQ-UI-093 empty sections say so and draw no chart", () => {
    const base = report();
    const { container } = render(
      <>
        <UsageSection usage={{ ...base.usage, members: [] }} project="all" />
        <DeliverySection delivery={{ ...base.delivery, weeks: [{ week: "2026-W44", counts: { task: 0 } }] }} />
        <QualitySection quality={{ ...base.quality, points: [] }} />
      </>,
    );
    expect(screen.getAllByText("No data in this period")).toHaveLength(3);
    expect(container.querySelector(".recharts-surface")).toBeNull();
  });
});

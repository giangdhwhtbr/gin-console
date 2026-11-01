import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliverySection as Delivery, Report } from "./api";
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
  it("REQ-UI-089 members chart has a bar per member and a legend per stage, with a table", () => {
    const base = report();
    const m = base.usage.members[0];
    const r = report({
      usage: {
        ...base.usage,
        members: [
          { ...m, member: "ann", stages: { execute: 30, review: 10 } },
          { ...m, member: "Unassigned", stages: { execute: 5 } },
        ],
      },
    });
    const { container } = render(usageOf(r));
    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBeGreaterThanOrEqual(2);
    const legend = container.querySelector(".recharts-legend-wrapper");
    expect(legend?.textContent).toContain("execute");
    expect(legend?.textContent).toContain("review");
    expect(screen.getByRole("row", { name: /ann 4 51\.1M \$12\.34 12\.8M 90%/ })).toBeTruthy();
  });

  it("REQ-UI-089 epic table links, shows children and budget; top beads listed", () => {
    const base = report();
    const e = base.usage.epics[0];
    const r = report({
      usage: { ...base.usage, epics: [{ ...e, children: 4, closed_children: 3, budget: { budget_usd: 20, cost: 12, status: "ok" } }] },
    });
    render(usageOf(r));
    expect(screen.getByRole("link", { name: /Epic one/ }).getAttribute("href")).toBe("/beads/alpha/a-1");
    expect(screen.getByText("3/4")).toBeTruthy();
    expect(screen.getByText(/ok \$12\.00 of \$20/)).toBeTruthy();
    expect(screen.getByText(/a-2 — Bead two/)).toBeTruthy();
  });

  it("REQ-UI-089 stage share names each stage with its percentage; model table columns", () => {
    render(usageOf(report()));
    expect(screen.getByText("implement — 78% (40M)")).toBeTruthy();
    expect(screen.getByText("review — 22% (11.1M)")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Cache write" })).toBeTruthy();
    expect(screen.getByRole("row", { name: /opus developer 1 2 3 4 10 \$1\.00/ })).toBeTruthy();
  });

  it("REQ-UI-090 delivery: weeks, cycle tables, WIP and estimates", () => {
    const base = report();
    const stat = { n: 3, median: 2, p85: 4 };
    const d: Delivery = {
      ...base.delivery,
      weeks: [
        { week: "2026-W43", counts: { task: 1, bug: 2 } },
        { week: "2026-W44", counts: { task: 3 } },
      ],
      by_type: [{ key: "task", cycle: stat, lead: null }],
      by_member: [{ key: "ann", cycle: stat, lead: { n: 3, median: 5, p85: 6 } }],
      wip: [{ member: "ann", count: 2 }],
      oldest: [{ project: "alpha", id: "a-7", title: "Old", assignee: "ann", age_days: 10 }],
    };
    const { container, rerender } = render(<DeliverySection delivery={d} />);
    expect(container.querySelectorAll(".recharts-bar").length).toBeGreaterThan(0);
    expect(screen.getByRole("row", { name: /task 3 2\.0 d 4\.0 d — —/ })).toBeTruthy();
    expect(screen.getByRole("row", { name: "ann 2" })).toBeTruthy();
    const old = screen.getByRole("row", { name: /a-7/ });
    expect(within(old).getByText("10.0 d")).toBeTruthy();
    expect(within(old).getByRole("link").getAttribute("href")).toBe("/beads/alpha/a-7");
    expect(screen.queryByText("Estimate vs actual")).toBeNull();
    rerender(<DeliverySection delivery={{ ...d, estimates: [{ project: "alpha", id: "e-1", title: "E", estimate_days: 5, actual_days: 6 }] }} />);
    expect(screen.getByText("Estimate vs actual")).toBeTruthy();
  });

  it("REQ-UI-091 clicking a point opens its bead page", () => {
    const r = report({ quality: { members: [], epics: [], points: [{ project: "alpha", id: "a-3", title: "T", tokens: 100, rework: 2 }] } });
    const { container } = render(<QualitySection quality={r.quality} />);
    const symbol = container.querySelector(".recharts-scatter-symbol");
    expect(symbol).not.toBeNull();
    fireEvent.click(symbol?.firstElementChild ?? symbol ?? container);
    expect(window.location.pathname).toBe("/beads/alpha/a-3");
  });

  it("REQ-UI-092 coverage: copy command, unpriced, unassigned, sources, fixed note", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const coverage = {
      not_collected: [{ project: "alpha", id: "a-9", title: "t", detail: "gin-workflow usage collect --bead a-9" }],
      invalid: [],
      unpriced: ["m1", "m2"],
      unassigned_share: 0.25,
      sources: [{ project: "alpha", id: "a-5", title: "x", sources: { claude: "missing", codex: "ok" }, skipped_lines: 3 }],
    };
    render(<CoverageSection coverage={coverage} errors={[{ project: "beta", error: "boom" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("gin-workflow usage collect --bead a-9");
    expect(screen.getByText(/Models without a price: m1, m2/)).toBeTruthy();
    expect(screen.getByText("Unassigned share of tokens: 25%")).toBeTruthy();
    expect(screen.getByText(/a-5, claude: missing, skipped lines: 3/)).toBeTruthy();
    expect(screen.getByText("beta: boom")).toBeTruthy();
    expect(
      screen.getByText("Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured."),
    ).toBeTruthy();
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

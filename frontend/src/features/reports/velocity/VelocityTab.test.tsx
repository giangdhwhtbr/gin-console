import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/beads/beadFixtures";
import type { MilestoneList } from "@/features/milestones/api";
import { entry, list } from "@/features/milestones/milestoneFixtures";
import { VelocityTab } from "./VelocityTab";
import { vel } from "./velocityFixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const alpha = (dpp = { value: 1.4, measured_epics: 6, assumed: false }) =>
  list(
    [
      entry("m1", { status: "closed", start: "2026-10-01", velocity: vel() }),
      entry("m2", { status: "active", start: "2026-11-03", velocity: vel({ committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08 }) }),
      entry("m3", { velocity: vel({ committed_points: null, completed_points: 0, say_do: null }) }),
    ],
    { days_per_point: dpp },
  );
const stub = (answer: (project: string) => Response) => {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, "http://localhost");
    return Promise.resolve(answer(url.searchParams.get("project") ?? ""));
  });
  vi.stubGlobal("fetch", mock);
};
const show = (projects: string[], loaded: ReadonlyMap<string, MilestoneList> = new Map()) => render(<VelocityTab projects={projects} loaded={loaded} />);

describe("VelocityTab", () => {
  it("REQ-REPORTS-018 milestones with velocity: figures, charts and table", async () => {
    stub(() => json(alpha()));
    show(["alpha"]);
    expect(await screen.findByText("1.4 d/pt")).toBeTruthy();
    expect(screen.getByText("38%", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("1.08", { selector: "dd" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Committed and completed points/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Days per point and planned/ })).toBeTruthy();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell").map((c) => c.textContent))).toEqual([
      ["m1", "10", "8", "0", "80%", "1.5", "1.2", "0.80"],
      ["m2", "13", "5", "2", "38%", "1.3", "1.4", "1.08"],
    ]);
    expect(screen.queryByText("m3")).toBeNull();
    expect(screen.queryByText("assumed")).toBeNull();
  });

  it("REQ-REPORTS-018 assumed days per point", async () => {
    stub(() => json(alpha({ value: 1, measured_epics: 0, assumed: true })));
    show(["alpha"]);
    expect(await screen.findByText("1.0 d/pt")).toBeTruthy();
    expect(screen.getByText("assumed")).toBeTruthy();
  });

  it("REQ-REPORTS-018 nothing kicked off yet", async () => {
    stub(() => json(list([entry("m1", { velocity: vel({ committed_points: null, completed_points: 0, say_do: null }) }), entry("m2")], { days_per_point: null })));
    show(["alpha"]);
    expect(await screen.findByText("No kicked-off milestones with points yet")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("REQ-REPORTS-018 all projects with one failing", async () => {
    stub((project) => (project === "beta" ? json({ error: "gin is too old", cause: "outdated" }, 502) : json(alpha())));
    show(["alpha", "beta"]);
    expect(await screen.findByText("Milestones need a newer gin")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "alpha" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "beta" })).toBeTruthy();
    expect(screen.getByText("1.4 d/pt")).toBeTruthy();
    expect(screen.getAllByRole("table")).toHaveLength(1);
  });

  it("REQ-REPORTS-018 a project the page already loaded is shown without a request; the others are requested", async () => {
    stub(() => json(alpha({ value: 2, measured_epics: 1, assumed: false })));
    show(["alpha", "beta"], new Map([["alpha", alpha()]]));
    expect(await screen.findByText("2.0 d/pt")).toBeTruthy();
    expect(screen.getByText("1.4 d/pt")).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls.map(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url))).toEqual(["/api/milestones?project=beta"]);
  });
});

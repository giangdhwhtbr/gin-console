import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Report } from "./api";
import { ReportsPage } from "./ReportsPage";
import { report } from "./reportFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const project = (name: string) => ({ name, path: `/x/${name}`, exists: true, beads: null });

const stub = (handler: (url: URL) => Response | Promise<Response> = () => json(report())) => {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, "http://localhost");
    if (url.pathname === "/api/projects/beads") return Promise.resolve(json([project("alpha"), project("beta")]));
    if (url.pathname === "/api/reports") return Promise.resolve(handler(url));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};
const requested = (mock: ReturnType<typeof stub>) => mock.mock.calls.map(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url));
const bead = (id: string) => ({ project: "alpha", id, title: id, detail: "" });
const withTokens = (tokens: number): Report => {
  const base = report();
  return report({ totals: { ...base.totals, tokens } });
};

beforeEach(() => window.history.replaceState(null, "", "/reports"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const reportCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/reports"));

describe("ReportsPage", () => {
  it("REQ-UI-088 opens a shared link", async () => {
    window.history.replaceState(null, "", "/reports?project=all&days=7");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(screen.getByLabelText("Project")).toHaveValue("all");
    expect(screen.getByRole("option", { name: "All projects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
    expect(requested(mock)).toContain("/api/reports?project=all&days=7");
  });

  it("REQ-UI-088 defaults to the first project and changes the period", async () => {
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=30");
    await userEvent.click(screen.getByRole("button", { name: "90 days" }));
    expect(window.location.search).toBe("?project=alpha&days=90&tab=delivery");
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=90");
  });

  it("REQ-UI-088 filters by sprint", async () => {
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    await userEvent.type(screen.getByLabelText("Sprint"), "s7{Enter}");
    expect(window.location.search).toBe("?project=alpha&days=30&sprint=s7&tab=delivery");
    await screen.findByText("Beads closed");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=30&sprint=s7");
  });

  it("REQ-UI-088 keeps the period across tabs", async () => {
    stub();
    render(<ReportsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
    await userEvent.click(screen.getByRole("tab", { name: /^Quality/ }));
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-088 shows 'no price' when the cost is unknown", async () => {
    window.history.replaceState(null, "", "/reports?tab=usage");
    stub(() => json(report({ totals: { ...report().totals, cost: null } })));
    render(<ReportsPage />);
    expect((await screen.findAllByText("no price")).length).toBeGreaterThan(0);
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

  it("REQ-UI-095 selects Delivery for an unknown tab", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&tab=nope");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    expect(screen.getByRole("tab", { name: /^Delivery/ })).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-UI-095 changes tab without a new request", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&days=90");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    const before = reportCalls(mock).length;
    await userEvent.click(screen.getByRole("tab", { name: /^AI usage/ }));
    expect(window.location.search).toBe("?project=alpha&days=90&tab=usage");
    expect(await screen.findByText("Cache reads")).toBeInTheDocument();
    expect(reportCalls(mock)).toHaveLength(before);
  });

  it("REQ-UI-095 shows a headline under each tab", async () => {
    const base = report();
    stub(() => json(report({ coverage: { ...base.coverage, unpriced: ["m1", "m2"] } })));
    render(<ReportsPage />);
    expect(await screen.findByRole("tab", { name: /Delivery\s*4 beads closed/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /AI usage\s*51\.1M tokens, \$12\.34/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Quality\s*25% rework/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Data coverage\s*2 gaps/ })).toBeInTheDocument();
  });

  it("REQ-UI-095 flags coverage gaps with a warning icon", async () => {
    const base = report();
    stub(() => json(report({ coverage: { ...base.coverage, not_collected: ["a", "b", "c"].map(bead), invalid: [bead("x")], unpriced: ["m1"] } })));
    render(<ReportsPage />);
    const tab = await screen.findByRole("tab", { name: /Data coverage\s*5 gaps/ });
    expect(tab.querySelector("svg")).not.toBeNull();
  });

  it("REQ-UI-095 shows no warning icon at 0 gaps", async () => {
    stub();
    render(<ReportsPage />);
    const tab = await screen.findByRole("tab", { name: /Data coverage\s*0 gaps/ });
    expect(tab.querySelector("svg")).toBeNull();
  });

  it("REQ-UI-095 shows no headline after a failed load", async () => {
    stub(() => json({ error: "boom" }, 502));
    render(<ReportsPage />);
    await screen.findByText("boom");
    for (const name of ["Delivery", "AI usage", "Quality", "Data coverage"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
  });

  it("REQ-UI-095 keeps the sprint across a tab change", async () => {
    window.history.replaceState(null, "", "/reports?project=alpha&days=30&sprint=s7");
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    await userEvent.click(screen.getByRole("tab", { name: /^Quality/ }));
    expect(window.location.search).toBe("?project=alpha&days=30&sprint=s7&tab=quality");
    expect(screen.getByLabelText("Sprint")).toHaveValue("s7");
  });

  it("REQ-UI-095 moves between tabs with the arrow keys", async () => {
    stub();
    render(<ReportsPage />);
    await screen.findByText("Beads closed");
    screen.getByRole("tab", { name: /^Delivery/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    const usage = screen.getByRole("tab", { name: /^AI usage/ });
    expect(usage).toHaveAttribute("aria-selected", "true");
    expect(usage).toHaveFocus();
    expect(window.location.search).toContain("tab=usage");
  });

  it("REQ-UI-093 shows a loading state without headlines", async () => {
    stub(() => new Promise<Response>(() => {}));
    render(<ReportsPage />);
    expect(await screen.findByText("Loading report…")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Delivery" })).toBeInTheDocument();
  });

  it("REQ-UI-093 shows an error and retries", async () => {
    let calls = 0;
    const mock = stub(() => (++calls === 1 ? json({ error: "boom" }, 502) : json(report())));
    render(<ReportsPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Beads closed")).toBeInTheDocument();
    expect(reportCalls(mock)).toHaveLength(2);
  });

  it("REQ-UI-093 warns about a partial failure and still shows the figures", async () => {
    stub(() => json(report({ errors: [{ project: "beta", error: "bd failed" }] })));
    render(<ReportsPage />);
    expect((await screen.findAllByText(/beta: bd failed/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Some projects could not be read")).toBeInTheDocument();
    expect(screen.getByText("Beads closed")).toBeInTheDocument();
  });

  it("REQ-UI-093 drops a late answer", async () => {
    window.history.replaceState(null, "", "/reports?tab=usage");
    let release: (response: Response) => void = () => {};
    stub((url) =>
      url.searchParams.get("days") === "30"
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : json(withTokens(7000)),
    );
    render(<ReportsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
    expect((await screen.findAllByText("7K")).length).toBeGreaterThan(0);
    release(json(withTokens(9000000)));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getAllByText("7K").length).toBeGreaterThan(0);
    expect(screen.queryByText("9M")).not.toBeInTheDocument();
  });
});

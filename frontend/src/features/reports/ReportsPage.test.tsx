import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Report } from "./api";
import { ReportsPage } from "./ReportsPage";
import { report } from "./reportFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const project = (name: string) => ({ name, path: `/x/${name}`, exists: true, workflow: null, beads: null });

const stub = (handler: (url: URL) => Response | Promise<Response> = () => json(report())) => {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, "http://localhost");
    if (url.pathname === "/api/projects") return Promise.resolve(json([project("alpha"), project("beta")]));
    if (url.pathname === "/api/reports") return Promise.resolve(handler(url));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};
const requested = (mock: ReturnType<typeof stub>) => mock.mock.calls.map(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url));
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

describe("ReportsPage", () => {
  it("REQ-UI-088 opens a shared link", async () => {
    window.history.replaceState(null, "", "/reports?project=all&days=7");
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Tokens");
    expect(screen.getByLabelText("Project")).toHaveValue("all");
    expect(screen.getByRole("option", { name: "All projects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
    expect(requested(mock)).toContain("/api/reports?project=all&days=7");
  });

  it("REQ-UI-088 defaults to the first project and changes the period", async () => {
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Tokens");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=30");
    await userEvent.click(screen.getByRole("button", { name: "90 days" }));
    expect(window.location.search).toBe("?project=alpha&days=90");
    await screen.findByText("Tokens");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=90");
  });

  it("REQ-UI-088 filters by sprint", async () => {
    const mock = stub();
    render(<ReportsPage />);
    await screen.findByText("Tokens");
    await userEvent.type(screen.getByLabelText("Sprint"), "s7{Enter}");
    expect(window.location.search).toBe("?project=alpha&days=30&sprint=s7");
    await screen.findByText("Tokens");
    expect(requested(mock)).toContain("/api/reports?project=alpha&days=30&sprint=s7");
  });

  it("REQ-UI-088 shows the KPI row", async () => {
    stub();
    render(<ReportsPage />);
    for (const label of ["Tokens", "Estimated cost", "Closed beads", "Tokens per bead", "Rework rate"]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("$12.34")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByTestId("report-sections")).toBeInTheDocument();
  });

  it("REQ-UI-088 shows 'no price' when the cost is unknown", async () => {
    stub(() => json(report({ totals: { ...report().totals, cost: null } })));
    render(<ReportsPage />);
    expect(await screen.findByText("no price")).toBeInTheDocument();
  });

  it("REQ-UI-093 shows a loading state", async () => {
    stub(() => new Promise<Response>(() => {}));
    render(<ReportsPage />);
    expect(await screen.findByText("Loading report…")).toBeInTheDocument();
  });

  it("REQ-UI-093 shows an error and retries", async () => {
    let calls = 0;
    const mock = stub(() => (++calls === 1 ? json({ error: "boom" }, 502) : json(report())));
    render(<ReportsPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Closed beads")).toBeInTheDocument();
    expect(requested(mock).filter((u) => u.startsWith("/api/reports"))).toHaveLength(2);
  });

  it("REQ-UI-093 warns about a partial failure and still shows the KPI row", async () => {
    stub(() => json(report({ errors: [{ project: "beta", error: "bd failed" }] })));
    render(<ReportsPage />);
    expect(await screen.findByText(/beta: bd failed/)).toBeInTheDocument();
    expect(screen.getByText("Some projects could not be read")).toBeInTheDocument();
    expect(screen.getByText("Closed beads")).toBeInTheDocument();
  });

  it("REQ-UI-093 drops a late answer", async () => {
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
    expect(await screen.findByText("7K")).toBeInTheDocument();
    release(json(withTokens(9000000)));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("7K")).toBeInTheDocument();
    expect(screen.queryByText("9M")).not.toBeInTheDocument();
  });
});

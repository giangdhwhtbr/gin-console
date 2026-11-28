import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetConfiguredProjects, rememberProject, setFavorite } from "@/app/project";
import { caseList, caseRow, jsonResponse, trends } from "./fixtures";
import { TestsPage } from "./TestsPage";

const projects = ["alpha", "beta"].map((name) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null }));
type Answer = () => Response;
function serve(answer: Answer = () => jsonResponse(trends())) {
  const fetched = vi.fn((url: string) =>
    Promise.resolve(
      url === "/api/projects/beads"
        ? jsonResponse(projects)
        : url.startsWith("/api/qa/trends")
          ? answer()
          : url.startsWith("/api/qa/cases")
            ? jsonResponse(caseList([caseRow({ id: "TC-UI-009", title: "Only on Cases" })]))
            : jsonResponse({}, 404),
    ),
  );
  vi.stubGlobal("fetch", fetched);
  return fetched;
}
const open = (url: string) => {
  window.history.replaceState(null, "", url);
  return render(<TestsPage />);
};
const url = () => window.location.pathname + window.location.search;
const requests = (fetched: ReturnType<typeof serve>) => fetched.mock.calls.map(([u]) => u).filter((u) => u.startsWith("/api/qa/trends"));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  rememberProject("alpha");
  setFavorite(null);
  forgetConfiguredProjects();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TrendsTab", () => {
  it("REQ-QA-018 Open the tab: 30 days pressed, the chart label, the flaky case, the median and the bug link", async () => {
    const fetched = serve();
    open("/tests?project=alpha&tab=trends");
    const chart = await screen.findByRole("img", { name: "Pass rate per day by capability, 2026-06-01 to 2026-06-03" });
    expect(chart).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "false");
    expect(requests(fetched)[0]).toMatch(/^\/api\/qa\/trends\/alpha\?days=30&tz=/);
    expect(screen.getByRole("link", { name: "TC-UI-001" })).toHaveAttribute("href", "/tests/alpha/TC-UI-001");
    expect(screen.getAllByText("1 h 45 min").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "gin-console-3kd" })).toHaveAttribute("href", "/beads/alpha/gin-console-3kd");
    expect(screen.getByRole("link", { name: "TC-BEADS-001" })).toHaveAttribute("href", "/tests/alpha/TC-BEADS-001");
    expect(screen.getByRole("tab", { name: "Trends" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Only on Cases")).toBeNull();
  });

  it("REQ-QA-018 Change the window: 7 days and the capability ui go into the URL and the request", async () => {
    const fetched = serve();
    open("/tests?project=alpha&tab=trends");
    await screen.findByRole("img");
    await userEvent.click(screen.getByRole("button", { name: "7 days" }));
    expect(url()).toBe("/tests?project=alpha&tab=trends&days=7");
    await userEvent.selectOptions(await screen.findByLabelText("Capability"), "ui");
    expect(url()).toBe("/tests?project=alpha&tab=trends&days=7&capability=ui");
    await screen.findByRole("img");
    expect(requests(fetched).at(-1)).toMatch(/^\/api\/qa\/trends\/alpha\?days=7&tz=.*&capability=ui$/);
  });

  it("REQ-QA-018 No fix yet: a capability with no fix and a case with no bug", async () => {
    serve(() => jsonResponse(trends({ time_to_fix: { overall: { fixes: 0, median_seconds: null }, by_capability: [{ name: "ui", fixes: 0, median_seconds: null }] } })));
    open("/tests?project=alpha&tab=trends");
    await screen.findByRole("img");
    expect(screen.getAllByText("No fix yet")).toHaveLength(2);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("REQ-QA-019 No runs: the window text and no chart", async () => {
    serve(() => jsonResponse(trends({ pass_rate: [], flaky: [], still_failing: [] })));
    open("/tests?project=beta&tab=trends");
    expect(await screen.findByText(/^No test runs in the last 30 days\./)).toHaveTextContent(
      "No test runs in the last 30 days. gin-qa records them when a case result, an e2e run or a tests run is written.",
    );
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("REQ-QA-019 Old gin-qa on the Trends tab only: the outdated text, then the Cases tab lists the cases", async () => {
    serve(() => jsonResponse({ error: "old", cause: "outdated" }, 502));
    open("/tests?project=alpha&tab=trends");
    expect(await screen.findByRole("alert")).toHaveTextContent("This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa");
    await userEvent.click(screen.getByRole("tab", { name: "Cases" }));
    expect(url()).toBe("/tests?project=alpha");
    expect(await screen.findByRole("list", { name: "Cases" })).toBeInTheDocument();
  });

  it("REQ-QA-019 missing and other failures: the missing text, and Try again that loads again", async () => {
    serve(() => jsonResponse({ error: "no gin-qa", cause: "missing" }, 502));
    open("/tests?project=alpha&tab=trends");
    expect(await screen.findByText("gin-qa is not installed on the console host")).toBeInTheDocument();
    cleanup();
    let answers = 0;
    serve(() => (answers++ === 0 ? jsonResponse({ error: "gin-qa timed out", cause: null }, 502) : jsonResponse(trends())));
    open("/tests?project=alpha&tab=trends");
    expect(await screen.findByText("gin-qa timed out")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("img")).toBeInTheDocument();
  });

  it("REQ-QA-019 problems: a note counts the lines that could not be read", async () => {
    serve(() => jsonResponse(trends({ problems: ["run 3: bad", "run 7: bad"] })));
    open("/tests?project=alpha&tab=trends");
    expect(await screen.findByText("2 lines of the run history could not be read")).toBeInTheDocument();
  });

  it("REQ-QA-018 no sideways scroll at 390px: each table sits in an overflow-x-auto frame with no fixed width", async () => {
    serve();
    open("/tests?project=alpha&tab=trends");
    await screen.findByRole("img");
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBeGreaterThanOrEqual(3);
    for (const table of tables) {
      expect(within(table.parentElement!).getAllByRole("table")).toHaveLength(1);
      expect(table.parentElement).toHaveClass("overflow-x-auto");
      expect(table.className).not.toMatch(/\bw-\[\d|\bmin-w-\[\d/);
    }
  });
});

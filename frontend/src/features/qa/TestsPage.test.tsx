import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetConfiguredProjects, rememberProject, resolveProject, setFavorite } from "@/app/project";
import { caseList, caseRow, counts, jsonResponse } from "./fixtures";
import { TestsPage } from "./TestsPage";

const LIST = caseList(
  [
    caseRow({ id: "TC-UI-002", title: "Logout", effective_result: "passed" }),
    caseRow({ id: "TC-UI-001", title: "Login", type: "api", result: "passed", effective_result: "outdated" }),
    caseRow({ id: "TC-BEADS-001", title: "List beads", capability: "beads", result: "not run", effective_result: "not run" }),
    caseRow({ id: "TC-UI-115", title: "Failing", effective_result: "failed", result: "failed", bug: "gin-console-3kd" }),
    caseRow({ id: "TC-UI-116", title: "Fixed", effective_result: "passed", bug: "gin-console-4aa" }),
  ],
  [counts("beads", { not_run: 1, total: 1 }), counts("ui", { passed: 2, outdated: 1, failed: 1, total: 4 })],
  [counts("api", { outdated: 1, total: 1 }), counts("e2e", { passed: 2, not_run: 1, failed: 1, total: 4 })],
);

const projects = ["a", "b", "qwikfone", "beta"].map((name) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null }));
type Answer = () => Response;
function serve(cases: Answer = () => jsonResponse(LIST)) {
  const fetched = vi.fn((url: string) => Promise.resolve(url === "/api/projects/beads" ? jsonResponse(projects) : url.startsWith("/api/qa/cases") ? cases() : jsonResponse({}, 404)));
  vi.stubGlobal("fetch", fetched);
  return fetched;
}
const open = (url: string) => {
  window.history.replaceState(null, "", url);
  return render(<TestsPage />);
};
const url = () => window.location.pathname + window.location.search;
const list = () => screen.findByRole("list", { name: "Cases" });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  rememberProject("a");
  setFavorite(null);
  forgetConfiguredProjects();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TestsPage", () => {
  it("REQ-QA-010 Counts and list: the capability table, the type table and every case, an outdated case with its last recorded result", async () => {
    const fetched = serve();
    open("/tests?project=a");
    const cases = await list();
    expect(fetched).toHaveBeenCalledWith("/api/qa/cases?project=a");
    const frame = screen.getByRole("heading", { name: "By capability" }).closest("section")!;
    const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent);
    const [, beads, ui] = within(frame).getAllByRole("row");
    expect(cells(beads)).toEqual(["beads", "0", "0", "0", "1", "0", "0", "1"]);
    expect(cells(ui)).toEqual(["ui", "2", "1", "0", "0", "1", "0", "4"]);
    expect(within(cases).getAllByRole("listitem")).toHaveLength(5);
    const login = within(cases).getByRole("link", { name: "TC-UI-001" }).closest("li")!;
    expect(login).toHaveTextContent("outdated");
    expect(login).toHaveTextContent("Last recorded: passed");
    expect(within(cases).getByRole("link", { name: "TC-UI-001" })).toHaveAttribute("href", "/tests/a/TC-UI-001");
    expect(screen.getByRole("heading", { name: "By type" })).toBeInTheDocument();
  });

  it("REQ-QA-010 Count as filter: activating the outdated count of ui sets capability and result and lists TC-UI-001 only", async () => {
    serve();
    open("/tests?project=a");
    await list();
    await userEvent.click(screen.getByRole("button", { name: "ui outdated: 1" }));
    expect(url()).toBe("/tests?project=a&capability=ui&result=outdated");
    const cases = await list();
    expect(within(cases).getAllByRole("listitem")).toHaveLength(1);
    expect(within(cases).getByRole("link", { name: "TC-UI-001" })).toBeInTheDocument();
  });

  it("REQ-QA-010 Failed with bug: filtering on failed lists the failed case with a link to its bead and not a passed case with a bug", async () => {
    serve();
    open("/tests?project=a");
    await list();
    await userEvent.selectOptions(screen.getByLabelText("Result"), "failed");
    expect(url()).toBe("/tests?project=a&result=failed");
    const cases = await list();
    expect(within(cases).getByRole("link", { name: "gin-console-3kd" })).toHaveAttribute("href", "/beads/a/gin-console-3kd");
    expect(within(cases).queryByRole("link", { name: "TC-UI-116" })).toBeNull();
    expect(within(cases).queryByText("gin-console-4aa")).toBeNull();
  });

  it("REQ-QA-010 the filters are read from the URL, and a search matches id and title", async () => {
    serve();
    open("/tests?project=a&type=e2e&q=LOG");
    const cases = await list();
    expect(within(cases).getAllByRole("link").map((link) => link.textContent)).toEqual(["TC-UI-002"]);
    expect(screen.getByLabelText("Type")).toHaveValue("e2e");
    await userEvent.click(screen.getByRole("button", { name: "ui passed: 2" }));
    expect(url()).toBe("/tests?project=a&capability=ui&result=passed");
  });

  it("REQ-QA-010 a filter that matches nothing offers Clear filters", async () => {
    serve();
    open("/tests?project=a&q=zzz");
    expect(await screen.findByText("No cases match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(url()).toBe("/tests?project=a");
    expect(await list()).toBeInTheDocument();
  });

  it("REQ-QA-010 neither table makes the page scroll sideways at 390px: each sits in an overflow-x-auto frame with no fixed width", async () => {
    serve();
    open("/tests?project=a");
    await list();
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.parentElement).toHaveClass("overflow-x-auto");
      expect(table.className).not.toMatch(/\bw-\[\d|\bmin-w-\[\d/);
    }
  });

  it("REQ-QA-013 Project without gin-qa: the page says so and shows no table", async () => {
    serve(() => jsonResponse({ error: "gin-qa not found", cause: "missing" }, 502));
    open("/tests?project=qwikfone");
    expect(await screen.findByText("gin-qa is not installed on the console host")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("REQ-QA-013 an old gin-qa, and any other failure with Try again that loads again", async () => {
    serve(() => jsonResponse({ error: "old", cause: "outdated" }, 502));
    open("/tests?project=a");
    expect(await screen.findByRole("alert")).toHaveTextContent("This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa");
    cleanup();
    let answers = 0;
    serve(() => (answers++ === 0 ? jsonResponse({ error: "gin-qa timed out", cause: null }, 502) : jsonResponse(LIST)));
    open("/tests?project=a");
    expect(await screen.findByText("gin-qa timed out")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await list()).toBeInTheDocument();
  });

  it("REQ-QA-013 No cases: a project whose export holds no case is told how to write them", async () => {
    serve(() => jsonResponse(caseList([])));
    open("/tests?project=beta");
    expect(await screen.findByText(/No test cases yet\. Write them with/)).toHaveTextContent("No test cases yet. Write them with /gin-qa:cases.");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("REQ-UI-124 Tests of the current project: /tests shows the remembered project and writes it into the URL with replace", async () => {
    serve();
    rememberProject("b");
    const before = window.history.length;
    open("/tests");
    await waitFor(() => expect(url()).toBe("/tests?project=b"));
    expect(window.history.length).toBe(before);
    await list();
    expect(window.location.search).toBe("?project=b");
    expect(resolveProject("", ["a", "b"])).toBe("b");
  });

  it("REQ-UI-124 the project the Tests page shows becomes the current one", async () => {
    serve();
    open("/tests?project=beta");
    await list();
    expect(resolveProject("", ["a", "beta"])).toBe("beta");
  });

  it("REQ-UI-126 a project that is not configured is named, with the configured ones", async () => {
    serve();
    open("/tests?project=ghost");
    expect(await screen.findByText("No project ghost is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "beta" })).toHaveAttribute("href", "/tests?project=beta");
  });
});

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetConfiguredProjects, rememberProject, resolveProject, setFavorite } from "@/app/project";
import { CasePage } from "./CasePage";
import { caseDetail, jsonResponse } from "./fixtures";

const projects = ["alpha", "c"].map((name) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null }));
function serve(detail: () => Response) {
  const fetched = vi.fn((url: string) => Promise.resolve(url === "/api/projects/beads" ? jsonResponse(projects) : url.startsWith("/api/qa/cases/") ? detail() : jsonResponse({}, 404)));
  vi.stubGlobal("fetch", fetched);
  return fetched;
}

const RUN = {
  folder: "qa/evidence/2026-11-23T10-34-33",
  status: "failed",
  started: "2026-11-23T10:34:33Z",
  finished: null,
  error: null,
  steps: [
    { n: 1, title: "Open the page", status: "passed", error: null, screenshot: true },
    { n: 2, title: "Press save", status: "failed", error: "Button missing", screenshot: false },
  ],
};

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

describe("CasePage", () => {
  it("REQ-QA-011 the case with its fields, requirements, steps, bug and a back link", async () => {
    const fetched = serve(() =>
      jsonResponse(
        caseDetail({
          id: "TC-UI-115",
          title: "Save works",
          effective_result: "failed",
          reqs: ["REQ-UI-001", "REQ-UI-002"],
          preconditions: ["Signed in"],
          steps: ["Open it", { do: "Press save" }],
          expected: ["It saves"],
          bug: { id: "gin-console-3kd", title: "Save fails", status: "open", priority: 1 },
        }),
      ),
    );
    render(<CasePage project="alpha" id="TC-UI-115" />);
    expect(await screen.findByRole("heading", { name: "TC-UI-115 Save works" })).toBeInTheDocument();
    expect(fetched).toHaveBeenCalledWith("/api/qa/cases/alpha/TC-UI-115");
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "REQ-UI-001" })).toHaveAttribute("href", "/requirements/matrix?project=alpha&req=REQ-UI-001");
    expect(screen.getByRole("link", { name: "REQ-UI-002" })).toHaveAttribute("href", "/requirements/matrix?project=alpha&req=REQ-UI-002");
    expect(screen.getByRole("link", { name: "gin-console-3kd" })).toHaveAttribute("href", "/beads/alpha/gin-console-3kd");
    expect(screen.getByText("Save fails")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.getByText('{"do":"Press save"}')).toBeInTheDocument();
    expect(screen.getByText("It saves")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All tests" })).toHaveAttribute("href", "/tests?project=alpha");
  });

  it("REQ-QA-011 a bug known only by its id shows the id and nothing else", async () => {
    serve(() => jsonResponse(caseDetail({ bug: { id: "gone-1", title: null, status: null, priority: null } })));
    render(<CasePage project="alpha" id="TC-UI-001" />);
    expect(await screen.findByRole("link", { name: "gone-1" })).toHaveAttribute("href", "/beads/alpha/gone-1");
    expect(screen.queryByText(/^P\d$/)).toBeNull();
  });

  it("REQ-QA-011 Run with screenshots: both steps shown, step 2 with its error and no thumbnail, the thumbnail of step 1 opens the lightbox", async () => {
    serve(() => jsonResponse(caseDetail({ id: "TC-UI-115", latest_run: RUN, latest_run_reason: null })));
    render(<CasePage project="alpha" id="TC-UI-115" />);
    const run = await screen.findByRole("region", { name: "Latest run" });
    expect(within(run).getByText("qa/evidence/2026-11-23T10-34-33")).toBeInTheDocument();
    const steps = within(run).getAllByRole("listitem");
    expect(steps).toHaveLength(2);
    expect(steps[1]).toHaveTextContent("Press save");
    expect(steps[1]).toHaveTextContent("Button missing");
    expect(within(steps[1]).queryByRole("button")).toBeNull();
    await userEvent.click(within(steps[0]).getByRole("button", { name: "Open screenshot of step 1" }));
    const dialog = await screen.findByRole("dialog", { name: "1. Open the page" });
    expect(within(dialog).getByRole("img", { name: "1. Open the page" })).toHaveAttribute("src", "/api/qa/cases/alpha/TC-UI-115/run/steps/1/screenshot");
    expect(within(dialog).getByText("1 of 1")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it.each([
    ["no_run", "No run recorded"],
    ["not_on_host", "Run folder is not on this host"],
    ["invalid", "Run files cannot be read"],
  ] as const)("REQ-QA-011 Run not here: the reason %s reads %s", async (reason, text) => {
    serve(() => jsonResponse(caseDetail({ latest_run: null, latest_run_reason: reason })));
    render(<CasePage project="alpha" id="TC-UI-121" />);
    expect(await within(await screen.findByRole("region", { name: "Latest run" })).findByText(text)).toBeInTheDocument();
  });

  it("REQ-QA-013 a case that cannot be read shows the cause instead of its content, and Try again loads it again", async () => {
    serve(() => jsonResponse({ error: "gin-qa not found", cause: "missing" }, 502));
    render(<CasePage project="alpha" id="TC-UI-001" />);
    expect(await screen.findByText("gin-qa is not installed on the console host")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Latest run" })).toBeNull();
    cleanup();
    let answers = 0;
    serve(() => (answers++ === 0 ? jsonResponse({ error: "boom", cause: null }, 502) : jsonResponse(caseDetail({ title: "Back" }))));
    render(<CasePage project="alpha" id="TC-UI-001" />);
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "TC-UI-001 Back" })).toBeInTheDocument();
  });

  it("REQ-UI-124 Tests of the current project: after the case page the current project is c", async () => {
    serve(() => jsonResponse(caseDetail()));
    render(<CasePage project="c" id="TC-UI-001" />);
    await screen.findByRole("heading", { name: /TC-UI-001/ });
    expect(resolveProject("", ["alpha", "c"])).toBe("c");
  });

  it("REQ-UI-126 a project that is not configured is named instead of the case", async () => {
    serve(() => jsonResponse(caseDetail()));
    render(<CasePage project="ghost" id="TC-UI-001" />);
    expect(await screen.findByText("No project ghost is configured")).toBeInTheDocument();
  });
});

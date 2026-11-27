import { act, cleanup, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearOrigin, getOrigin } from "@/app/origin";
import { forgetConfiguredProjects, rememberProject, resolveProject, setFavorite } from "@/app/project";
import { navigate } from "@/app/route";
import type { ChangeContent, ChangeList, ChangeRow, Mockup, MockupList } from "./api";
import { jsonResponse, listOf, requirement, signoff } from "./fixtures";
import { RequirementsPage } from "./RequirementsPage";
import { clearSections, useRequirementSections } from "./sectionStore";

const change = (fields: Partial<ChangeRow> = {}): ChangeRow => ({ folder: "e1-login", change: "e1", title: "Login", epic: "e1", archived: null, signoff: signoff(), added: 1, modified: 0, removed: 0, ...fields });
const changes = (...rows: ChangeRow[]): ChangeList => ({ changes: rows, error: null, cause: null });
const mockup: Mockup = { capability: "ui", date: "2026-11-22", confirmed: "2026-11-23", confirmed_by: "ba", description: "Home", html: ["index.html"], images: [], requirements: [], grant: null };
const mockups: MockupList = { mockups: [mockup] };
const content: ChangeContent = { folder: "e1-login", change: "e1", title: "Login", epic: "e1", archived: null, files: { proposal: "Why" } };
const LIST = listOf(
  requirement({ id: "REQ-UI-001", title: "Covered one" }),
  requirement({ id: "REQ-UI-002", title: "Untested one", status: "untested" }),
  requirement({ id: "REQ-UI-003", title: "Failing one", status: "failing" }),
  requirement({ id: "REQ-UI-004", title: "Removed one", state: "removed", status: null }),
);

type Answer = Response | Promise<Response>;
const defaults: Record<string, () => Answer> = {
  "/api/projects/beads": () => jsonResponse(["a", "b"].map((name) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null }))),
  "/api/requirements": () => jsonResponse(LIST),
  "/api/requirements/changes": () => jsonResponse(changes(change(), change({ folder: "2026-01-01-old", title: "Old", archived: "2026-01-01" }))),
  "/api/requirements/mockups": () => jsonResponse(mockups),
  "/api/requirements/changes/a/e1-login": () => jsonResponse(content),
};
const scrollTo = vi.fn();
const pending = () => new Promise<Response>(() => undefined);

/** Answers by path; `over` replaces an answer, keyed by the path or by the whole URL. */
function serve(over: Record<string, () => Answer> = {}) {
  const fetched = vi.fn((url: string) => {
    const answer = over[url] ?? over[url.split("?")[0]] ?? defaults[url.split("?")[0]];
    return Promise.resolve(answer === undefined ? jsonResponse({ error: "not found" }, 404) : answer());
  });
  vi.stubGlobal("fetch", fetched);
  return fetched;
}
const open = (url: string) => {
  window.history.replaceState(null, "", url);
  return render(<RequirementsPage />);
};
const url = () => window.location.pathname + window.location.search;
const row = () => screen.findByRole("navigation", { name: "Requirement sections" });
const rowTexts = async () => within(await row()).getAllByRole("link").map((link) => link.textContent);

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  rememberProject("a");
  setFavorite(null);
  clearOrigin();
  forgetConfiguredProjects();
  scrollTo.mockClear();
  vi.stubGlobal("scrollTo", scrollTo);
});
afterEach(() => {
  cleanup();
  clearSections();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RequirementsPage paths", () => {
  it.each([
    ["/requirements?project=a", "/requirements/matrix?project=a"],
    ["/requirements/?project=a&status=untested&q=x", "/requirements/matrix?project=a&status=untested&q=x"],
  ])("REQ-REQUIREMENTS-012 Redirect: %s becomes %s without a history entry", async (from, to) => {
    serve();
    const before = window.history.length;
    open(from);
    await waitFor(() => expect(url()).toBe(to));
    expect(await screen.findByRole("button", { name: "Untested 1" })).toBeInTheDocument();
    expect(window.history.length).toBe(before);
  });

  it.each(["/requirements/nope", "/requirements/matrix/x", "/requirements/changes/", "/requirements/changes/a/b", "/requirements/changes/%E0%A4%A"])(
    "REQ-REQUIREMENTS-012 Unknown section: %s shows Page not found and asks for nothing",
    async (path) => {
      const fetched = serve();
      open(path);
      expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
      expect(screen.getByText(path)).toBeInTheDocument();
      await waitFor(() => expect(document.title).toBe("Page not found · gin-console"));
      expect(fetched.mock.calls.filter(([asked]) => asked.startsWith("/api/requirements"))).toEqual([]);
      expect(getOrigin().kind).toBe("beads");
    },
  );

  it("REQ-REQUIREMENTS-017 a change folder is decoded from its path", async () => {
    const fetched = serve();
    open("/requirements/changes/my%20change?project=a");
    expect(await screen.findByRole("heading", { name: "Change my change was not found" })).toBeInTheDocument();
    expect(fetched.mock.calls.some(([asked]) => asked === "/api/requirements/changes/a/my%20change")).toBe(true);
  });
});

describe("RequirementsPage project", () => {
  it("REQ-UI-124 a page without project shows the current one and writes it, keeping the path and the query, without a history entry", async () => {
    serve();
    rememberProject("b");
    const before = window.history.length;
    open("/requirements/matrix?status=untested&q=one");
    await waitFor(() => expect(url()).toBe("/requirements/matrix?status=untested&q=one&project=b"));
    expect(window.history.length).toBe(before);
    expect(await screen.findByText("Untested one")).toBeInTheDocument();
  });

  it("REQ-UI-124 /requirements without project goes to the Matrix of the current project", async () => {
    serve();
    rememberProject("b");
    open("/requirements");
    await waitFor(() => expect(url()).toBe("/requirements/matrix?project=b"));
  });

  it("REQ-UI-124 a change page without project keeps its folder and tab", async () => {
    serve();
    open("/requirements/changes/e1-login?tab=proposal");
    await waitFor(() => expect(url()).toBe("/requirements/changes/e1-login?tab=proposal&project=a"));
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("REQ-UI-124 the project shown becomes the current one", async () => {
    serve();
    open("/requirements/matrix?project=b");
    await screen.findByText("Untested one");
    expect(resolveProject("", ["a", "b"])).toBe("b");
  });

  it("REQ-UI-126 Requirements query: an unknown project shows the notice with links, no requirements, and is not remembered", async () => {
    const fetched = serve();
    rememberProject("b");
    open("/requirements/matrix?project=zzz");
    expect(await screen.findByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "a" })).toHaveAttribute("href", "/requirements/matrix?project=a");
    expect(screen.getByRole("link", { name: "b" })).toHaveAttribute("href", "/requirements/matrix?project=b");
    expect(fetched.mock.calls.filter(([asked]) => asked.startsWith("/api/requirements"))).toEqual([]);
    expect(url()).toBe("/requirements/matrix?project=zzz");
    expect(resolveProject("", ["a", "b"])).toBe("b");
    expect(getOrigin().kind).toBe("beads");
  });

  it("REQ-UI-126 the links of a change page keep its path", async () => {
    serve();
    open("/requirements/changes/e1-login?project=zzz&tab=plan");
    expect(await screen.findByRole("link", { name: "b" })).toHaveAttribute("href", "/requirements/changes/e1-login?project=b");
  });

  it("REQ-UI-124 the project list that fails is said, and none configured too", async () => {
    serve({ "/api/projects/beads": () => jsonResponse({}, 500) });
    open("/requirements/matrix?project=a");
    expect(await screen.findByText("Projects could not be loaded")).toBeInTheDocument();
    cleanup();
    forgetConfiguredProjects();
    serve({ "/api/projects/beads": () => jsonResponse([]) });
    open("/requirements/matrix");
    expect(await screen.findByText("No projects configured.")).toBeInTheDocument();
  });

  it("REQ-UI-123 a project switch drops the data of the old project", async () => {
    serve({ "/api/requirements?project=b": pending, "/api/requirements/changes?project=b": pending, "/api/requirements/mockups?project=b": pending });
    open("/requirements/matrix?project=a");
    await screen.findByText("Untested one");
    await waitFor(async () => expect(await rowTexts()).toEqual(["Matrix 2", "Changes 1", "Mockups 1"]));
    act(() => navigate("/requirements/matrix?project=b"));
    expect(screen.queryByText("Untested one")).toBeNull();
    expect(screen.getByText("Loading requirements")).toBeInTheDocument();
    expect(await rowTexts()).toEqual(["Matrix", "Changes", "Mockups"]);
  });

  it("REQ-UI-123 a late answer for the old project is dropped", async () => {
    let answer: (response: Response) => void = () => undefined;
    const late = new Promise<Response>((resolve) => {
      answer = resolve;
    });
    serve({ "/api/requirements?project=a": () => late, "/api/requirements?project=b": () => jsonResponse(listOf(requirement({ title: "Of b" }))) });
    open("/requirements/matrix?project=a");
    await screen.findByText("Loading requirements");
    act(() => navigate("/requirements/matrix?project=b"));
    await screen.findByText("Of b");
    await act(async () => {
      answer(jsonResponse(LIST));
      await late;
    });
    expect(screen.queryByText("Untested one")).toBeNull();
    expect(screen.getByText("Of b")).toBeInTheDocument();
  });
});

describe("RequirementsPage sections", () => {
  it("REQ-REQUIREMENTS-012 the row of links: names, numbers, targets, and the current one; hidden in the wide expanded shell", async () => {
    serve();
    open("/requirements/changes?project=a&x=1");
    await waitFor(async () => expect(await rowTexts()).toEqual(["Matrix 2", "Changes 1", "Mockups 1"]));
    const nav = await row();
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/requirements/matrix?project=a", "/requirements/changes?project=a", "/requirements/mockups?project=a"]);
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, "page", null]);
    expect(nav).toHaveClass("overflow-x-auto"); // Phone: the row scrolls, the page does not
    expect(nav.closest(".lg\\:group-data-\\[sidebar\\=expanded\\]\\/shell\\:hidden")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  });

  it("REQ-REQUIREMENTS-012 the mockups section is shown and marked", async () => {
    serve();
    open("/requirements/mockups?project=a");
    expect(await screen.findByRole("heading", { name: "ui" })).toBeInTheDocument();
    expect(within(await row()).getByRole("link", { name: "Mockups 1" })).toHaveAttribute("aria-current", "page");
  });

  it("REQ-REQUIREMENTS-012 publishes the sections for the sidebar, and clears them on unmount", async () => {
    serve();
    const view = open("/requirements/changes?project=a");
    const { result } = renderHook(() => useRequirementSections());
    await waitFor(() => expect(result.current.sections.map((s) => [s.section, s.count])).toEqual([["matrix", 2], ["changes", 1], ["mockups", 1]]));
    expect(result.current.selected).toBe("changes");
    const first = result.current;
    view.rerender(<RequirementsPage />);
    expect(result.current).toBe(first); // publishing the same sections again changes nothing
    act(() => view.unmount());
    expect(result.current).toEqual({ sections: [], selected: null });
  });

  it("REQ-REQUIREMENTS-012 the sections go away for an unknown project and on the not-found page", async () => {
    serve();
    open("/requirements/changes?project=a");
    await row();
    const { result } = renderHook(() => useRequirementSections());
    act(() => navigate("/requirements/changes?project=zzz"));
    expect(result.current.sections).toEqual([]);
    act(() => navigate("/requirements/changes?project=a"));
    expect(result.current.sections).toHaveLength(3);
    act(() => navigate("/requirements/nope?project=a"));
    expect(result.current.sections).toEqual([]);
  });

  it("REQ-REQUIREMENTS-012 a change page belongs to Changes and keeps the links", async () => {
    serve();
    open("/requirements/changes/e1-login?project=a");
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(within(await row()).getByRole("link", { name: /^Changes/ })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("None")).toBeInTheDocument(); // the sign-off of the change's row
  });

  it("REQ-REQUIREMENTS-012 the three requests start together, and a pending or failed one leaves the others and its own number out", async () => {
    const fetched = serve({ "/api/requirements": pending, "/api/requirements/mockups": () => jsonResponse({ error: "boom" }, 500) });
    open("/requirements/changes?project=a");
    expect(await screen.findByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(await rowTexts()).toEqual(["Matrix", "Changes 1", "Mockups"]);
    expect(fetched.mock.calls.map(([asked]) => asked).filter((asked) => asked.startsWith("/api/requirements")).sort()).toEqual([
      "/api/requirements/changes?project=a",
      "/api/requirements/mockups?project=a",
      "/api/requirements?project=a",
    ]);
    act(() => navigate("/requirements/mockups?project=a"));
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("REQ-REQUIREMENTS-012 changing the section does not ask again", async () => {
    const fetched = serve();
    open("/requirements/matrix?project=a");
    await screen.findByText("Untested one");
    await waitFor(async () => expect(await rowTexts()).toEqual(["Matrix 2", "Changes 1", "Mockups 1"]));
    const before = fetched.mock.calls.length;
    act(() => navigate("/requirements/changes?project=a"));
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(fetched.mock.calls.length).toBe(before);
  });

  it.each([
    ["changes", "Loading changes", "This project has no changes yet."],
    ["mockups", "Loading mockups", "This project has no confirmed mockups yet."],
  ])("REQ-REQUIREMENTS-019 an empty %s section shows loading until the list answers, and its normal text once the list failed", async (section, loading, empty) => {
    let fail: () => void = () => undefined;
    const list = new Promise<Response>((resolve) => {
      fail = () => resolve(jsonResponse({ error: "boom" }, 502));
    });
    serve({ "/api/requirements": () => list, "/api/requirements/changes": () => jsonResponse(changes()), "/api/requirements/mockups": () => jsonResponse({ mockups: [] }) });
    open(`/requirements/${section}?project=a`);
    await waitFor(async () => expect(await rowTexts()).toEqual(["Matrix", "Changes 0", "Mockups 0"]));
    expect(screen.getByText(loading)).toBeInTheDocument();
    expect(screen.queryByText(empty)).toBeNull();
    act(() => fail());
    expect(await screen.findByText(empty)).toBeInTheDocument();
    expect(screen.queryByText(loading)).toBeNull();
  });

  it("REQ-REQUIREMENTS-019 Legacy: every section says the layout has no requirement ids", async () => {
    serve({
      "/api/requirements": () => jsonResponse({ ...listOf(), layout: "legacy" }),
      "/api/requirements/changes": () => jsonResponse(changes()),
      "/api/requirements/mockups": () => jsonResponse({ mockups: [] }),
    });
    open("/requirements/matrix?project=a");
    for (const section of ["matrix", "changes", "mockups"]) {
      act(() => navigate(`/requirements/${section}?project=a`));
      expect(await screen.findByText("This project uses the legacy layout, which has no requirement ids.")).toBeInTheDocument();
    }
  });
});

describe("RequirementsPage title and place", () => {
  it.each([
    ["/requirements/matrix?project=a", "Requirements · Matrix · a · gin-console"],
    ["/requirements/changes?project=a", "Requirements · Changes · a · gin-console"],
    ["/requirements/mockups?project=a", "Requirements · Mockups · a · gin-console"],
    ["/requirements/changes/e1-login?project=a", "e1-login · a · gin-console"],
  ])("REQ-UI-063 %s is titled %s", async (address, title) => {
    serve();
    open(address);
    expect(document.title).toBe("gin-console"); // the project is still loading
    await waitFor(() => expect(document.title).toBe(title));
  });

  it.each(["/requirements/matrix?project=a&status=untested", "/requirements/changes/e1-login?project=a&tab=plan"])("REQ-UI-073 %s is remembered for the project", async (address) => {
    serve();
    open(address);
    await row();
    await waitFor(() => expect(getOrigin()).toMatchObject({ kind: "requirements", path: address.split("?")[0], search: `?${address.split("?")[1]}`, project: "a" }));
  });

  it("REQ-UI-073 the place remembered carries the project written into the URL", async () => {
    serve();
    open("/requirements/matrix?status=untested");
    await waitFor(() => expect(getOrigin()).toMatchObject({ kind: "requirements", search: "?status=untested&project=a" }));
  });

  it("REQ-UI-127 Back to the matrix restores its scroll once its list is shown", async () => {
    serve();
    navigate("/requirements/matrix?project=a");
    Object.defineProperty(window, "scrollY", { value: 640, configurable: true });
    const left: unknown = window.history.state;
    navigate("/beads/a/a-1");
    window.history.replaceState(left, "", "/requirements/matrix?project=a");
    window.dispatchEvent(new PopStateEvent("popstate"));
    render(<RequirementsPage />);
    await screen.findByText("Untested one");
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 640));
  });
});

import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/features/projects/api";
import type { BeadSummary } from "./api";
import { BeadsPage } from "./BeadsPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const bead = (id: string, overrides: Partial<BeadSummary> = {}): BeadSummary => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 2,
  issue_type: "task",
  labels: [],
  owner: null,
  assignee: null,
  parent: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  ...overrides,
});

const project = (name: string, exists = true): Project => ({
  name,
  path: `/home/gin/${name}`,
  scotty_id: null,
  scotty_url: null,
  exists,
  workflow: null,
  beads: null,
});

const defaultProjects: Project[] = [project("alpha", true), project("omega", true), project("ghost", false)];

const stub = (
  beadsHandler: (url: URL) => Response | Promise<Response> = () => json([]),
  projects: Project[] = defaultProjects,
) => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlString, "http://localhost");
    if (url.pathname === "/api/projects") {
      return Promise.resolve(json(projects));
    }
    if (url.pathname === "/api/beads") {
      return Promise.resolve(beadsHandler(url));
    }
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  window.history.replaceState(null, "", "/beads");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BeadsPage", () => {
  // REQ-UI-023
  it("REQ-UI-023 default and choice", async () => {
    stub((url) => {
      const p = url.searchParams.get("project");
      if (p === "alpha") return json([bead("a-1", { title: "Alpha Bead" })]);
      if (p === "omega") return json([bead("o-1", { title: "Omega Bead" })]);
      return json([]);
    });
    render(<BeadsPage />);
    await screen.findByText("Alpha Bead");
    const select = screen.getByLabelText("Project");
    expect(select).toHaveValue("alpha");
    expect(screen.queryByRole("option", { name: "ghost" })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, "omega");
    expect(await screen.findByText("Omega Bead")).toBeInTheDocument();
    expect(window.location.search).toBe("?project=omega");
  });

  // REQ-UI-023
  it("REQ-UI-023 no projects", async () => {
    stub(() => json([]), []);
    render(<BeadsPage />);
    expect(await screen.findByText(/no projects configured/i)).toBeInTheDocument();
  });

  // REQ-UI-024
  it("REQ-UI-024 row content and order", async () => {
    const yesterday = "2026-10-19T10:00:00Z";
    const lastWeek = "2026-10-12T10:00:00Z";
    const p2 = bead("alpha-p2", {
      priority: 2,
      updated_at: yesterday,
      title: "P2 bead title",
      issue_type: "feature",
      status: "in_progress",
      labels: ["ui", "design"],
      assignee: "alice",
    });
    const p1 = bead("alpha-p1", {
      priority: 1,
      updated_at: lastWeek,
      title: "P1 bead title",
      issue_type: "bug",
      status: "open",
      labels: ["core"],
      assignee: null,
      owner: "bob",
    });
    stub(() => json([p2, p1]));
    render(<BeadsPage />);
    await screen.findByText("alpha-p1");

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("alpha-p1");
    expect(rows[2]).toHaveTextContent("alpha-p2");

    const row1 = within(rows[1]);
    expect(row1.getByText("alpha-p1")).toBeInTheDocument();
    const link1 = row1.getByRole("link", { name: "P1 bead title" });
    expect(link1).toHaveAttribute("href", "/beads/alpha/alpha-p1");
    expect(row1.getByText("bug")).toBeInTheDocument();
    expect(row1.getByText("open")).toBeInTheDocument();
    expect(row1.getByText("P1")).toBeInTheDocument();
    expect(row1.getByText("core")).toBeInTheDocument();
    expect(row1.getByText("bob")).toBeInTheDocument();
    expect(row1.getByText(new Date(lastWeek).toLocaleString())).toBeInTheDocument();

    const row2 = within(rows[2]);
    expect(row2.getByText("alpha-p2")).toBeInTheDocument();
    const link2 = row2.getByRole("link", { name: "P2 bead title" });
    expect(link2).toHaveAttribute("href", "/beads/alpha/alpha-p2");
    expect(row2.getByText("feature")).toBeInTheDocument();
    expect(row2.getByText("in_progress")).toBeInTheDocument();
    expect(row2.getByText("P2")).toBeInTheDocument();
    expect(row2.getByText("ui")).toBeInTheDocument();
    expect(row2.getByText("design")).toBeInTheDocument();
    expect(row2.getByText("alice")).toBeInTheDocument();
    expect(row2.getByText(new Date(yesterday).toLocaleString())).toBeInTheDocument();
  });

  // REQ-UI-024
  it("REQ-UI-024 count and empty", async () => {
    const beads: BeadSummary[] = [];
    for (let i = 1; i <= 83; i++) {
      beads.push(
        bead(`b-${i}`, {
          title: i <= 5 ? `Matching task ${i}` : `Other task ${i}`,
          labels: i <= 5 ? ["target"] : [],
        }),
      );
    }
    stub(() => json(beads));
    render(<BeadsPage />);
    await screen.findByText("b-1");
    expect(screen.getByText("83 of 83")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search"), "Matching");
    expect(screen.getByText("5 of 83")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByLabelText("Search"), "nomatchxyz");
    expect(screen.getByText("0 of 83")).toBeInTheDocument();
    expect(screen.getByText(/no beads match/i)).toBeInTheDocument();
  });

  // REQ-UI-025
  it("REQ-UI-025 search and combined filters", async () => {
    const b1 = bead("b-1", { title: "Fix login", status: "open", priority: 1 });
    const b2 = bead("b-2", { title: "Add search", status: "in_progress", priority: 1 });
    const b3 = bead("b-3", { title: "Login crash", status: "in_progress", priority: 2 });
    stub(() => json([b1, b2, b3]));
    render(<BeadsPage />);
    await screen.findByText("Fix login");

    const historyLenBefore = window.history.length;
    await userEvent.type(screen.getByLabelText("Search"), "LOGIN");
    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.getByText("Login crash")).toBeInTheDocument();
    expect(screen.queryByText("Add search")).not.toBeInTheDocument();
    expect(window.location.search).toContain("q=LOGIN");
    expect(window.history.length).toBe(historyLenBefore);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "open");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "1");
    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.queryByText("Login crash")).not.toBeInTheDocument();
    expect(window.location.search).toContain("status=open");
    expect(window.location.search).toContain("priority=1");

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Fix login")).toBeInTheDocument();
    expect(screen.getByText("Add search")).toBeInTheDocument();
    expect(screen.getByText("Login crash")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getByLabelText("Status")).toHaveValue("");
    expect(screen.getByLabelText("Priority")).toHaveValue("");
  });

  // REQ-UI-025
  it("REQ-UI-025 restored from the URL", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&status=open&q=fix");
    const b1 = bead("b-1", { title: "Fix login", status: "open" });
    const b2 = bead("b-2", { title: "Fix crash", status: "in_progress" });
    const b3 = bead("b-3", { title: "Add auth", status: "open" });
    stub(() => json([b1, b2, b3]));
    render(<BeadsPage />);
    await screen.findByText("Fix login");

    expect(screen.queryByText("Fix crash")).not.toBeInTheDocument();
    expect(screen.queryByText("Add auth")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveValue("fix");
    expect(screen.getByLabelText("Status")).toHaveValue("open");
  });

  // REQ-UI-026
  it("REQ-UI-026 show closed", async () => {
    const openBead = bead("b-1", { title: "Open bead", status: "open" });
    const closedBead = bead("b-2", { title: "Closed bead", status: "closed" });
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        requestedUrls.push(url.search);
        const closed = url.searchParams.get("closed") === "1";
        return Promise.resolve(json(closed ? [openBead, closedBead] : [openBead]));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadsPage />);
    await screen.findByText("Open bead");
    expect(screen.queryByText("Closed bead")).not.toBeInTheDocument();
    expect(requestedUrls[0]).not.toContain("closed=1");

    await userEvent.click(screen.getByLabelText("Show closed"));
    expect(await screen.findByText("Closed bead")).toBeInTheDocument();
    expect(requestedUrls.some((u) => u.includes("closed=1"))).toBe(true);
    expect(window.location.search).toContain("closed=1");

    await userEvent.type(screen.getByLabelText("Search"), "Closed");
    expect(screen.getByText("Closed bead")).toBeInTheDocument();
    expect(screen.queryByText("Open bead")).not.toBeInTheDocument();
  });

  // REQ-UI-027
  it("REQ-UI-027 silent refresh", async () => {
    vi.useFakeTimers();
    let callIndex = 0;
    let failRefresh = false;
    const fetchCalls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        fetchCalls.push(urlString);
        callIndex++;
        if (failRefresh) {
          return Promise.resolve(json({ error: "bd exited 1: boom" }, 500));
        }
        if (callIndex === 1) {
          return Promise.resolve(json([bead("b-1", { title: "Fix login" })]));
        }
        return Promise.resolve(json([bead("b-1", { title: "Renamed" })]));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    const visibilitySpy = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(<BeadsPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Fix login")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).toBeNull();

    const callsBeforeHidden = fetchCalls.length;
    visibilitySpy.mockReturnValue("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchCalls.length).toBe(callsBeforeHidden);

    visibilitySpy.mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchCalls.length).toBe(callsBeforeHidden + 1);

    failRefresh = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("bd exited 1: boom");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  // REQ-UI-029
  it("REQ-UI-029 list error and retry", async () => {
    let attempts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve(json({ error: "bd not found" }, 502));
        }
        return Promise.resolve(json([bead("b-1", { title: "Success bead" })]));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bd not found");

    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Success bead")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-029
  it("REQ-UI-029 malformed response shows alert and Retry", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(urlString, "http://localhost");
      if (url.pathname === "/api/projects") {
        return Promise.resolve(json([project("alpha")]));
      }
      if (url.pathname === "/api/beads") {
        return Promise.resolve(json({ x: 1 }));
      }
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadsPage />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unexpected response/i);
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  // REQ-UI-022
  it("REQ-UI-022 plain text in title does not execute script", async () => {
    const maliciousTitle = "<script>window.hacked = 1</script>";
    stub(() => json([bead("b-sec", { title: maliciousTitle })]));
    const { container } = render(<BeadsPage />);
    await screen.findByText(maliciousTitle);
    expect(container.querySelector("script")).toBeNull();
  });
  // REQ-UI-027
  it("REQ-UI-027 a slow older response never overwrites a newer one", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    let releaseOld: (response: Response) => void = () => undefined;
    const old = new Promise<Response>((resolve) => {
      releaseOld = resolve;
    });
    let openCalls = 0;
    stub((url) => {
      if (url.searchParams.get("closed") === "1") {
        return json([bead("o-1", { title: "Open one" }), bead("c-1", { title: "Closed one", status: "closed" })]);
      }
      openCalls += 1;
      return openCalls === 1 ? json([bead("o-1", { title: "Open one" })]) : old;
    });
    render(<BeadsPage />);
    await screen.findByText("Open one");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange")); // a refresh that stays slow
    });
    await userEvent.click(screen.getByLabelText("Show closed"));
    expect(await screen.findByText("Closed one")).toBeInTheDocument();
    await act(async () => {
      releaseOld(json([bead("o-1", { title: "Open one" })]));
      await old;
    });
    expect(screen.getByText("Closed one")).toBeInTheDocument();
  });

  // REQ-UI-027
  it("REQ-UI-027 a stale error never replaces newer data", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    let failOld: (response: Response) => void = () => undefined;
    const old = new Promise<Response>((resolve) => {
      failOld = resolve;
    });
    let calls = 0;
    stub(() => {
      calls += 1;
      if (calls === 1) return json([bead("o-1", { title: "First" })]);
      if (calls === 2) return old;
      return json([bead("o-1", { title: "Newest" })]);
    });
    render(<BeadsPage />);
    await screen.findByText("First");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange")); // second request, slow
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange")); // third request, fast
    });
    await screen.findByText("Newest");
    await act(async () => {
      failOld(json({ error: "bd timed out" }, 502));
      await old;
    });
    expect(screen.getByText("Newest")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

});

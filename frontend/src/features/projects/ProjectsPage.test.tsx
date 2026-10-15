import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Beads, Project, Workflow } from "./api";
import { ProjectsPage } from "./ProjectsPage";

vi.mock("@/features/quota/QuotaStrip", () => ({ QuotaStrip: () => null }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const project = (overrides: Partial<Project> = {}): Project => ({
  name: "qwikfone",
  path: "/home/gin/qwikfone",
  scotty_id: null,
  scotty_url: null,
  exists: true,
  workflow: null,
  beads: null,
  ...overrides,
});

const workflow: Workflow = {
  stage: "plan",
  layout: "sdd",
  gates: { requirement_confirmed: "satisfied", plan_approved: "unmet" },
};

const beads: Beads = {
  open: 3,
  in_progress: 1,
  blocked: 0,
  ready: 2,
  epics: [{ id: "e1", title: "Epic one" }],
};

const cardOf = (name: string) => screen.getByRole("article", { name });

afterEach(() => {
  cleanup(); // vitest runs without globals, so Testing Library does not clean up by itself
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectsPage", () => {
  // REQ-UI-001
  it("REQ-UI-001 lists projects and marks missing ones", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json([project(), project({ name: "old", path: "/home/gin/old", exists: false })]),
        ),
    );
    render(<ProjectsPage />);
    await screen.findByRole("article", { name: "qwikfone" });
    expect(within(cardOf("qwikfone")).getByText("/home/gin/qwikfone")).toBeInTheDocument();
    expect(within(cardOf("qwikfone")).queryByText("missing")).not.toBeInTheDocument();
    expect(within(cardOf("old")).getByText("missing")).toBeInTheDocument();
  });

  // REQ-UI-001
  it("REQ-UI-001 shows an empty state naming the config file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
    render(<ProjectsPage />);
    expect(await screen.findByText(/no projects configured/i)).toBeInTheDocument();
    expect(screen.getByText(/~\/\.config\/gin-console\/config\.yaml/)).toBeInTheDocument();
  });

  // REQ-UI-002
  it("REQ-UI-002 shows an error and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ detail: "boom" }, 500))
      .mockResolvedValueOnce(json([project({ name: "scotty" })]));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("article", { name: "scotty" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // REQ-UI-003
  it("REQ-UI-003 shows the stage and one chip per gate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ workflow })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByText("plan")).toBeInTheDocument();
    expect(within(card).getByText("requirement_confirmed: satisfied")).toBeInTheDocument();
    expect(within(card).getByText("plan_approved: unmet")).toBeInTheDocument();
  });

  // REQ-UI-004
  it("REQ-UI-004 shows the Beads counts and the active epics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    for (const text of ["open 3", "in progress 1", "blocked 0", "ready 2"]) {
      expect(within(card).getByText(text)).toBeInTheDocument();
    }
    expect(within(card).getByText("e1")).toBeInTheDocument();
    expect(within(card).getByText(/Epic one/)).toBeInTheDocument();
  });

  // REQ-UI-004
  it("REQ-UI-004 says when there are no active epics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json([project({ beads: { ...beads, epics: [] } })])),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByText(/no active epics/i)).toBeInTheDocument();
  });

  // REQ-UI-005
  it("REQ-UI-005 links the project and its epics to Scotty in a new tab", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json([project({ name: "scotty", scotty_id: "scotty", scotty_url: "https://h/p/scotty", beads })]),
        ),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "scotty" });
    const projectLink = within(card).getByRole("link", { name: "scotty" });
    expect(projectLink).toHaveAttribute("href", "https://h/p/scotty");
    const epicLink = within(card).getByRole("link", { name: "e1" });
    expect(epicLink).toHaveAttribute("href", "https://h/p/scotty?bead=e1");
    for (const link of [projectLink, epicLink]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  // REQ-UI-005
  it("REQ-UI-005 renders no link without a Scotty URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ beads })])));
    render(<ProjectsPage />);
    await screen.findByRole("article", { name: "qwikfone" });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // REQ-UI-007
  it("REQ-UI-007 shows a block error and still shows the other block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json([project({ workflow, beads: { error: "bd not found" } })])),
    );
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "qwikfone" });
    expect(within(card).getByText(/bd not found/)).toBeInTheDocument();
    expect(within(card).getByText("plan")).toBeInTheDocument();
  });

  describe("refresh", () => {
    const visibility = (state: "visible" | "hidden") =>
      vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);

    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    // REQ-UI-006
    it("REQ-UI-006 reloads every 10 seconds without a loading state", async () => {
      vi.useFakeTimers();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json([project({ workflow })]))
        .mockResolvedValue(json([project({ workflow: { ...workflow, stage: "execute" } })]));
      vi.stubGlobal("fetch", fetchMock);
      render(<ProjectsPage />);
      await advance(0);
      expect(within(cardOf("qwikfone")).getByText("plan")).toBeInTheDocument();
      await advance(10_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(within(cardOf("qwikfone")).getByText("execute")).toBeInTheDocument();
    });

    // REQ-UI-006
    it("REQ-UI-006 does not poll while hidden and reloads when visible again", async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn().mockResolvedValue(json([project()]));
      vi.stubGlobal("fetch", fetchMock);
      const state = visibility("visible");
      render(<ProjectsPage />);
      await advance(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      state.mockReturnValue("hidden");
      await advance(30_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      state.mockReturnValue("visible");
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // REQ-UI-006
    it("REQ-UI-006 keeps the last data when a refresh fails and retries on demand", async () => {
      vi.useFakeTimers();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(json([project()]))
        .mockResolvedValueOnce(json({ detail: "boom" }, 500))
        .mockResolvedValue(json([project({ name: "scotty" })]));
      vi.stubGlobal("fetch", fetchMock);
      render(<ProjectsPage />);
      await advance(0);
      await advance(10_000);
      expect(screen.getByRole("alert")).toHaveTextContent(/500/);
      expect(cardOf("qwikfone")).toBeInTheDocument();
      await act(async () => {
        screen.getByRole("button", { name: /retry/i }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(cardOf("scotty")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadDetail } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const beadDetail = (id: string, overrides: Partial<BeadDetail> = {}): BeadDetail => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 1,
  issue_type: "task",
  labels: ["frontend", "urgent"],
  owner: "alice",
  assignee: "bob",
  parent: null,
  created_at: "2026-10-01T12:00:00Z",
  updated_at: "2026-10-10T12:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 3,
  closed_at: null,
  ready: false,
  blocked: false,
  created_by: null,
  description: "A description",
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [],
  dependents: [],
  children: [],
  ...overrides,
});

beforeEach(() => {
  window.history.replaceState(null, "", "/beads/alpha/a-5");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BeadDetailPage", () => {
  // REQ-UI-028
  it("REQ-UI-028 shows fields and description as plain text", async () => {
    const created_at = "2026-10-01T12:00:00Z";
    const updated_at = "2026-10-10T12:00:00Z";
    const rawDesc = "<script>window.hacked = 1</script> **bold**\nsecond line";
    const bead = beadDetail("a-5", {
      title: "Bead five",
      status: "open",
      priority: 1,
      issue_type: "task",
      labels: ["frontend", "urgent"],
      owner: "alice",
      assignee: "bob",
      created_at,
      updated_at,
      comment_count: 3,
      description: rawDesc,
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(bead))));

    const { container } = render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Bead five" })).toBeInTheDocument();
    expect(screen.getByText("a-5")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();

    const meta = screen.getByText(
      (content) =>
        content.includes("Owner alice") &&
        content.includes("Assignee bob") &&
        content.includes(`Created ${new Date(created_at).toLocaleString()}`) &&
        content.includes(`Updated ${new Date(updated_at).toLocaleString()}`) &&
        content.includes("3 comments"),
    );
    expect(meta).toBeInTheDocument();

    const descEl = screen.getByText((_, el) => el?.tagName === "P" && el.textContent === rawDesc);
    expect(descEl).toBeInTheDocument();
    expect(descEl).toHaveClass("whitespace-pre-wrap");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });

  // REQ-UI-028
  it("REQ-UI-028 links relations inside the console and encodes project name", async () => {
    const bead = beadDetail("a-5", {
      dependencies: [{ id: "a-4", title: "Dep title", status: "open", type: "blocks" }],
      dependents: [{ id: "a-6", title: "Blocked title", status: "closed", type: "blocks" }],
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(bead))));

    render(<BeadDetailPage project="alpha" id="a-5" />);

    await screen.findByRole("heading", { name: "Depends on" });
    const depLink = screen.getByRole("link", { name: "a-4" });
    expect(depLink).toHaveAttribute("href", "/beads/alpha/a-4");
    expect(screen.getByText("Dep title")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Blocks" })).toBeInTheDocument();
    const blockedLink = screen.getByRole("link", { name: "a-6" });
    expect(blockedLink).toHaveAttribute("href", "/beads/alpha/a-6");
    expect(screen.getByText("Blocked title")).toBeInTheDocument();
    const [depItem, blockedItem] = screen.getAllByRole("listitem");
    expect(within(depItem).getByText("open")).toBeInTheDocument();
    expect(within(blockedItem).getByText("closed")).toBeInTheDocument();

    cleanup();
    render(<BeadDetailPage project="my proj" id="a-5" />);
    await screen.findByRole("heading", { name: "Depends on" });
    const depLinkEncoded = screen.getByRole("link", { name: "a-4" });
    expect(depLinkEncoded).toHaveAttribute("href", "/beads/my%20proj/a-4");
  });

  // REQ-UI-028
  it("REQ-UI-028 shows epic progress and children, or omits them when absent", async () => {
    const epic = beadDetail("e-1", {
      issue_type: "epic",
      children: [
        { id: "c-1", title: "Child 1", status: "closed", type: "parent-child" },
        { id: "c-2", title: "Child 2", status: "closed", type: "parent-child" },
        { id: "c-3", title: "Child 3", status: "closed", type: "parent-child" },
        { id: "c-4", title: "Child 4", status: "open", type: "parent-child" },
      ],
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(epic))));

    render(<BeadDetailPage project="alpha" id="e-1" />);

    const bar = await screen.findByRole("progressbar", { name: "Children closed" });
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByText("3 of 4 closed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Children" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "c-1" })).toHaveAttribute("href", "/beads/alpha/c-1");

    cleanup();
    const simpleBead = beadDetail("a-5", { children: [] });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(simpleBead))));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    await screen.findByRole("heading", { name: "Title a-5" });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Children" })).not.toBeInTheDocument();
  });

  // REQ-UI-029
  it("REQ-UI-029 shows not found when bead returns 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "not found" }, 404))));

    render(<BeadDetailPage project="alpha" id="a-404" />);

    expect(await screen.findByText("Bead not found")).toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: "Back to beads" });
    expect(backLink).toHaveAttribute("href", "/beads?project=alpha");
  });

  // REQ-UI-029
  it("REQ-UI-029 shows error on failure and retries, and handles unexpected shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: "bd timed out" }, 502))
      .mockResolvedValueOnce(json(beadDetail("a-5")));
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadDetailPage project="alpha" id="a-5" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bd timed out");

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    cleanup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ x: 1 }))));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    const badAlert = await screen.findByRole("alert");
    expect(badAlert).toHaveTextContent(/unexpected response/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  // REQ-UI-028
  it("REQ-UI-028 shows No description. when description is null", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(beadDetail("a-5", { description: null })))));

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByText("No description.")).toBeInTheDocument();
  });
});

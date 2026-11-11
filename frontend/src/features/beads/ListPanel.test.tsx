import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadDetail, BeadSummary, Comment } from "./api";
import { bead, json, project } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";
import { clearReturn } from "./returnState";

const makeDetail = (summary: BeadSummary, overrides: Partial<BeadDetail> = {}): BeadDetail => ({
  ...summary,
  description: "A description",
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [],
  dependents: [],
  children: [],
  bugs: [],
  ...overrides,
});

const note = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  author: "alice",
  text: `Text of ${id}`,
  created_at: "2026-10-05T10:00:00Z",
  truncated: false,
  ...overrides,
});

function stubTreeWithDetail(
  beadsList: readonly BeadSummary[],
  options?: {
    detailOverrides?: (id: string) => Partial<BeadDetail>;
    comments?: (id: string) => Promise<Comment[]> | Comment[];
  },
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(text, "http://localhost");
    if (url.pathname === "/api/projects/beads") {
      return Promise.resolve(json([project("alpha")]));
    }
    if (url.pathname === "/api/beads") {
      return Promise.resolve(json(beadsList));
    }
    const detailPrefix = "/api/beads/alpha/";
    if (url.pathname.startsWith(detailPrefix)) {
      const rest = url.pathname.slice(detailPrefix.length);
      if (!rest.includes("/")) {
        const id = decodeURIComponent(rest);
        const found = beadsList.find((b) => b.id === id) ?? bead(id);
        const detail = makeDetail(found, options?.detailOverrides?.(id));
        return Promise.resolve(json(detail));
      }
      const commentsSuffix = "/comments";
      if (rest.endsWith(commentsSuffix) && rest.indexOf("/") === rest.length - commentsSuffix.length) {
        const id = decodeURIComponent(rest.slice(0, -commentsSuffix.length));
        if (options?.comments) {
          return Promise.resolve(options.comments(id)).then((c) => json(c));
        }
        return Promise.resolve(json([]));
      }
    }
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  clearReturn();
  window.history.replaceState(null, "", "/beads");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ListPanel", () => {
  it("REQ-UI-045 select shows the panel: clicking node selects and shows details and comments", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubTreeWithDetail(
      [bead("t-1", { title: "Task One", comment_count: 1 })],
      {
        comments: () => [note("c-1", { text: "Comment of t-1" })],
      },
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    const item = await screen.findByRole("treeitem", { name: /t-1/ });
    await user.click(item);

    expect(window.location.search).toContain("select=t-1");
    expect(item).toHaveAttribute("aria-selected", "true");

    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("heading", { name: "Task One" })).toBeInTheDocument();
    expect(await within(panel).findByText("Comment of t-1")).toBeInTheDocument();
  });

  it("REQ-UI-045 nothing selected: panel prompts to select a bead", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubTreeWithDetail([bead("t-1", { title: "Task One" })]);
    render(<BeadsPage />);

    expect(await screen.findByRole("tree")).toBeInTheDocument();
    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(within(panel).getByText("Select a bead to see its details")).toBeInTheDocument();
  });

  it("REQ-UI-078 the details panel stays in view, scrolls by itself and takes focus", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubTreeWithDetail([bead("t-1", { title: "Task One" })]);
    render(<BeadsPage />);

    expect(await screen.findByRole("tree")).toBeInTheDocument();
    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(panel).toHaveClass("lg:sticky", "lg:max-h-[calc(100dvh-3rem)]", "lg:overflow-y-auto", "lg:overscroll-contain");
    expect(panel).toHaveAttribute("tabindex", "0");
  });

  it("REQ-UI-045 restored: URL selection restored at load and opens branch", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=t-1");
    stubTreeWithDetail([
      bead("e-1", { issue_type: "epic", title: "Epic One" }),
      bead("t-1", { parent: "e-1", title: "Task One" }),
    ]);
    render(<BeadsPage />);

    const t1 = await screen.findByRole("treeitem", { name: /t-1/ });
    expect(t1).toHaveAttribute("aria-selected", "true");
    const e1 = screen.getByRole("treeitem", { name: /e-1/ });
    expect(e1).toHaveAttribute("aria-expanded", "true");

    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("heading", { name: "Task One" })).toBeInTheDocument();
  });

  it("REQ-UI-045 not in the list: still shown with notice", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=t-1&q=zzz");
    stubTreeWithDetail([bead("t-1", { title: "Task One" })]);
    render(<BeadsPage />);

    expect(await screen.findByText("No beads match.")).toBeInTheDocument();
    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(within(panel).getByText("Not in the current list")).toBeInTheDocument();
    expect(await within(panel).findByRole("heading", { name: "Task One" })).toBeInTheDocument();
  });

  it("REQ-UI-045 open page link: panel has Open page and no Back to beads", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=t-1");
    stubTreeWithDetail([bead("t-1", { title: "Task One" })]);
    render(<BeadsPage />);

    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    const openLink = await within(panel).findByRole("link", { name: "Open page" });
    expect(openLink).toHaveAttribute("href", "/beads/alpha/t-1");
    expect(within(panel).queryByRole("link", { name: "Back to beads" })).toBeNull();
  });

  it("REQ-UI-045 selection changes: late comments from previous selection do not appear", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    let resolveT1Comments: (c: Comment[]) => void = () => {};
    const t1CommentsPromise = new Promise<Comment[]>((resolve) => {
      resolveT1Comments = resolve;
    });

    stubTreeWithDetail(
      [
        bead("t-1", { title: "Task One", comment_count: 1 }),
        bead("t-2", { title: "Task Two", comment_count: 1 }),
      ],
      {
        comments: (id) =>
          id === "t-1"
            ? t1CommentsPromise
            : [note("c-2", { text: "Comment of t-2" })],
      },
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    const item1 = await screen.findByRole("treeitem", { name: /t-1/ });
    const item2 = screen.getByRole("treeitem", { name: /t-2/ });

    await user.click(item1);
    const panel = screen.getByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("heading", { name: "Task One" })).toBeInTheDocument();

    await user.click(item2);
    expect(await within(panel).findByRole("heading", { name: "Task Two" })).toBeInTheDocument();
    expect(await within(panel).findByText("Comment of t-2")).toBeInTheDocument();

    await act(async () => {
      resolveT1Comments([note("c-1", { text: "Late comment of t-1" })]);
      await t1CommentsPromise;
    });

    expect(within(panel).queryByText("Late comment of t-1")).toBeNull();
    expect(within(panel).getByText("Comment of t-2")).toBeInTheDocument();
  });
});

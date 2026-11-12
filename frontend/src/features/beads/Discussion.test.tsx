import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadDetail, Comment } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import { DISCUSSION_KEY, setDiscussionHidden } from "./discussion";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (detail: BeadDetail, comments: () => Response | Promise<Response> = () => json([])) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return Promise.resolve(url.endsWith("/comments") ? comments() : json(detail));
    }),
  );

const note = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  author: "alice",
  text: `Text of ${id}`,
  created_at: "2026-10-05T10:00:00Z",
  truncated: false,
  ...overrides,
});

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
  comment_count: 0,
  closed_at: null,
  ready: false,
  blocked: false,
  created_by: null,
  blocked_by: [],
  milestone: null,
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

beforeEach(() => {
  window.localStorage.clear();
  setDiscussionHidden(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const open = async (comments: number, embedded = false) => {
  stubFetch(beadDetail("a-5", { comment_count: comments }), () => json([note("c-1"), note("c-2")].slice(0, comments)));
  render(<BeadDetailPage project="alpha" id="a-5" embedded={embedded} />);
  await screen.findByRole("heading", { name: "Title a-5" });
};

describe("Discussion", () => {
  it("REQ-UI-069 a bead with comments has the tabs, Details first", async () => {
    await open(2);
    const tabs = screen.getByRole("tablist");
    expect(within(tabs).getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Discussion (2)" })).toHaveAttribute("aria-selected", "false");
  });

  it("REQ-UI-069 selecting Discussion shows it instead of the details", async () => {
    await open(2);
    await userEvent.click(screen.getByRole("tab", { name: "Discussion (2)" }));
    expect(screen.getByRole("tab", { name: "Discussion (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Details" })).toHaveClass("hidden");
    expect(await screen.findByText("Text of c-1")).toBeInTheDocument();
  });

  it("REQ-UI-069 the arrow keys change tab", async () => {
    await open(2);
    screen.getByRole("tab", { name: "Details" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Discussion (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Discussion (2)" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-UI-069 REQ-UI-068 the page form hides the tabs from 1024px, the panel form never does", async () => {
    await open(2);
    expect(screen.getByRole("tablist")).toHaveClass("lg:hidden");
    cleanup();
    await open(2, true);
    expect(screen.getByRole("tablist")).not.toHaveClass("lg:hidden");
  });

  it("REQ-UI-069 a bead without comments has no tabs, no discussion and no comments request", async () => {
    await open(0);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("region", { name: "Discussion" })).toBeNull();
    const urls = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url));
    expect(urls.some((url) => url.endsWith("/comments"))).toBe(false);
  });

  it("REQ-UI-070 Hide discussion hides it, Show brings it back, and the choice is kept", async () => {
    await open(2);
    await userEvent.click(screen.getByRole("button", { name: "Hide discussion" }));
    expect(window.localStorage.getItem(DISCUSSION_KEY)).toBe("hidden");
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
    cleanup();
    await open(2);
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show discussion (2)" }));
    expect(screen.getByRole("button", { name: "Hide discussion" })).toBeInTheDocument();
    expect(window.localStorage.getItem(DISCUSSION_KEY)).toBeNull();
  });

  it("REQ-UI-070 hides without an error when storage refuses", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await open(2);
    await userEvent.click(screen.getByRole("button", { name: "Hide discussion" }));
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
  });

  it("REQ-UI-070 hides when only writing is refused", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    await open(2);
    await userEvent.click(screen.getByRole("button", { name: "Hide discussion" }));
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
  });

  it("REQ-UI-068 REQ-UI-070 the column classes follow the choice", async () => {
    await open(2);
    const panel = screen.getByRole("tabpanel", { name: "Discussion (2)" });
    expect(panel).toHaveClass("lg:sticky", "lg:block", "lg:overflow-y-auto");
    await userEvent.click(screen.getByRole("button", { name: "Hide discussion" }));
    expect(screen.getByRole("tabpanel", { name: "Discussion (2)" })).toHaveClass("lg:hidden");
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toHaveClass("hidden", "lg:inline-flex");
  });

  it("REQ-UI-078 the discussion column stays in view and scrolls by itself", async () => {
    await open(2);
    const column = screen.getByRole("tabpanel", { name: "Discussion (2)" });
    expect(column).toHaveClass("lg:sticky", "lg:max-h-[calc(100dvh-3rem)]", "lg:overflow-y-auto", "lg:overscroll-contain");
    expect(column).toHaveAttribute("tabindex", "0");
  });

  it("REQ-UI-071 each comment is a block with the author in bold, the time and the text apart", async () => {
    await open(2);
    const authors = await screen.findAllByText("alice");
    expect(authors).toHaveLength(2);
    expect(authors[0]).toHaveClass("font-semibold");
    const text = screen.getByText("Text of c-1");
    expect(text).not.toHaveClass("text-muted-foreground");
    expect(text.closest("li")).toHaveClass("border");
  });

  it("REQ-UI-067 the header shows the type pill", async () => {
    stubFetch(beadDetail("a-5", { issue_type: "epic" }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText("epic")).toHaveAttribute("data-type", "epic");
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "./api";
import { SessionLogPage } from "./SessionLogPage";

const ID = "11111111-1111-4111-8111-111111111111";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const session = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: ID,
  project: "qwikfone",
  title: "Fix the bug",
  cwd: "/home/gin/qwikfone",
  modified: "2026-10-14T08:00:00Z",
  size: 2048,
  live: false,
  name: null,
  status: null,
  kind: null,
  resume_command: "cd /home/gin/qwikfone && claude --resume 11111111-1111-4111-8111-111111111111",
  ...overrides,
});

const page = (items: unknown[], next: number | null) => ({ items, next_offset: next });
const text = (role: "user" | "assistant", value: string, truncated = false) => ({
  role,
  blocks: [{ type: "text", text: value, name: null, input: null, truncated }],
});

function stubApi(routes: { messages: (offset: number) => Response; list?: () => Response }) {
  const fetchMock = vi.fn((url: string) => {
    const messages = /\/messages\?offset=(\d+)/.exec(url);
    if (messages) return Promise.resolve(routes.messages(Number(messages[1])));
    return Promise.resolve(routes.list ? routes.list() : json([session()]));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const block = (type: string, overrides: Record<string, unknown> = {}) => ({
  type,
  text: null,
  name: null,
  input: null,
  truncated: false,
  ...overrides,
});

const rich = {
  role: "assistant",
  blocks: [
    block("text", { text: "hello there" }),
    block("thinking", { text: "pondering" }),
    block("tool_use", { name: "Bash", input: '{"command":"ls"}' }),
    block("tool_result", { text: "file.txt", truncated: true }),
  ],
};

const open = (label: RegExp) => screen.getByText(label).closest("details");

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SessionLogPage", () => {
  // REQ-UI-012
  it("REQ-UI-012 shows the header and the messages in order", async () => {
    stubApi({ messages: () => json(page([text("user", "first"), text("assistant", "second")], null)) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await screen.findByText("first");
    expect(await screen.findByText("Fix the bug")).toBeInTheDocument();
    expect(screen.getByText("/home/gin/qwikfone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy resume" })).toBeInTheDocument();
    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("user")).toBeInTheDocument();
    expect(within(articles[1]).getByText("assistant")).toBeInTheDocument();
  });

  // REQ-UI-012
  it("REQ-UI-012 collapses thinking, tool calls and results", async () => {
    stubApi({ messages: () => json(page([rich], null)) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByText("hello there")).toBeVisible();
    expect(open(/tool_use: Bash/)).toHaveProperty("open", false);
    expect(open(/^thinking$/)).toHaveProperty("open", false);
    expect(open(/^tool_result$/)).toHaveProperty("open", false);
    expect(screen.getByText("truncated")).toBeInTheDocument();
  });

  // REQ-UI-012
  it("REQ-UI-012 never interprets transcript text", async () => {
    const hostile = "<script>window.hacked = 1</script> **bold**";
    stubApi({ messages: () => json(page([text("user", hostile)], null)) });
    const { container } = render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByText(hostile)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });

  // REQ-UI-013
  it("REQ-UI-013 loads more until there is no next offset", async () => {
    const fetchMock = stubApi({
      messages: (offset) =>
        json(offset === 0 ? page([text("user", "one")], 3) : page([text("user", "two")], null)),
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("two")).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("offset=3"));
  });

  // REQ-UI-013
  it("REQ-UI-013 refreshes a live session without duplicating messages", async () => {
    let calls = 0;
    stubApi({
      list: () => json([session({ live: true })]),
      messages: () => {
        calls += 1;
        return json(
          page(calls === 1 ? [text("user", "one")] : [text("user", "one"), text("user", "two")], null),
        );
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await screen.findByText("one");
    await userEvent.click(await screen.findByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("two")).toBeInTheDocument();
    expect(screen.getAllByText("one")).toHaveLength(1);
  });

  // REQ-UI-013
  it("REQ-UI-013 offers no refresh for an ended session", async () => {
    stubApi({ messages: () => json(page([text("user", "one")], null)) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await screen.findByText("one");
    await screen.findByText("Fix the bug");
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
  });

  // REQ-UI-014
  it("REQ-UI-014 says when the session is not found", async () => {
    stubApi({ messages: () => new Response("", { status: 404 }) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByText("Session not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sessions" })).toHaveAttribute("href", "/sessions");
  });

  // REQ-UI-014
  it("REQ-UI-014 shows a load error and retries", async () => {
    let calls = 0;
    stubApi({
      messages: () => {
        calls += 1;
        return calls === 1 ? json({}, 500) : json(page([text("user", "back")], null));
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("back")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-014
  it("REQ-UI-014 keeps the loaded messages when load more fails and retries it", async () => {
    let second = 0;
    stubApi({
      messages: (offset) => {
        if (offset === 0) return json(page([text("user", "one")], 3));
        second += 1;
        return second === 1 ? json({}, 500) : json(page([text("user", "two")], null));
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    expect(screen.getByText("one")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("two")).toBeInTheDocument();
  });

  // REQ-UI-014
  it("REQ-UI-014 handles malformed message responses with an error and retry", async () => {
    let calls = 0;
    stubApi({
      messages: () => {
        calls += 1;
        return calls === 1
          ? json({ items: "not-an-array", next_offset: null })
          : json(page([text("user", "recovered")], null));
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected response/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("recovered")).toBeInTheDocument();
  });
});

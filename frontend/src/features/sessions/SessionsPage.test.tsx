import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "./api";
import { SessionsPage } from "./SessionsPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const session = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: "11111111-1111-4111-8111-111111111111",
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

const stub = (...bodies: Response[]) => {
  const fetchMock = vi.fn();
  bodies.forEach((body) => fetchMock.mockResolvedValueOnce(body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const stubAlways = (make: () => Response) => {
  const fetchMock = vi.fn(() => Promise.resolve(make()));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => window.history.replaceState(null, "", "/sessions"));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ID2 = "22222222-2222-4222-8222-222222222222";
const rowOf = (title: string) => {
  const row = screen.getByText(title).closest("tr");
  if (row === null) throw new Error(`no row for ${title}`);
  return row;
};
const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("SessionsPage", () => {
  // REQ-UI-009
  it("REQ-UI-009 shows title, project, cwd and the live badge", async () => {
    stubAlways(() =>
      json([
        session({ live: true, status: "busy", kind: "bg" }),
        session({ id: ID2, title: "Old one" }),
      ]),
    );
    render(<SessionsPage />);
    await screen.findByText("Fix the bug");
    expect(within(rowOf("Fix the bug")).getByText("live")).toBeInTheDocument();
    expect(within(rowOf("Fix the bug")).getByText(/busy/)).toBeInTheDocument();
    expect(within(rowOf("Old one")).queryByText("live")).not.toBeInTheDocument();
    expect(within(rowOf("Old one")).getByText("qwikfone")).toBeInTheDocument();
    expect(within(rowOf("Old one")).getByText("/home/gin/qwikfone")).toBeInTheDocument();
  });

  // REQ-UI-009
  it("REQ-UI-009 says when there are no sessions", async () => {
    stubAlways(() => json([]));
    render(<SessionsPage />);
    expect(await screen.findByText(/no sessions found/i)).toBeInTheDocument();
  });

  // REQ-UI-009
  it("REQ-UI-009 filters by project and keeps it in the URL", async () => {
    stubAlways(() =>
      json([session(), session({ id: ID2, title: "Console work", project: "gin-console" })]),
    );
    render(<SessionsPage />);
    await screen.findByText("Fix the bug");
    await userEvent.selectOptions(screen.getByLabelText("Project"), "gin-console");
    expect(screen.queryByText("Fix the bug")).not.toBeInTheDocument();
    expect(screen.getByText("Console work")).toBeInTheDocument();
    expect(window.location.search).toBe("?project=gin-console");
  });

  // REQ-UI-009
  it("REQ-UI-009 reads the filter from the URL", async () => {
    window.history.replaceState(null, "", "/sessions?project=gin-console");
    stubAlways(() =>
      json([session(), session({ id: ID2, title: "Console work", project: "gin-console" })]),
    );
    render(<SessionsPage />);
    await screen.findByText("Console work");
    expect(screen.queryByText("Fix the bug")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Project")).toHaveValue("gin-console");
  });

  // REQ-UI-010
  it("REQ-UI-010 refreshes every 10 seconds without a loading state", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json([session()])))
      .mockImplementation(() => Promise.resolve(json([session({ title: "Renamed" })])));
    vi.stubGlobal("fetch", fetchMock);
    render(<SessionsPage />);
    await settle(0);
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    await settle(10_000);
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // REQ-UI-010
  it("REQ-UI-010 keeps the list when a refresh fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json([session()])))
      .mockImplementation(() => Promise.resolve(json({}, 500)));
    vi.stubGlobal("fetch", fetchMock);
    render(<SessionsPage />);
    await settle(0);
    await settle(10_000);
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/500/);
  });

  // REQ-UI-014
  it("REQ-UI-014 shows a list error and retries", async () => {
    stub(json({}, 500), json([session()]));
    render(<SessionsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("Fix the bug")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-011
  it("REQ-UI-011 copies the resume command", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    stubAlways(() => json([session()]));
    render(<SessionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy resume" }));
    expect(writeText).toHaveBeenCalledWith(session().resume_command);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  // REQ-UI-011
  it("REQ-UI-011 shows the command when the clipboard refuses", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    stubAlways(() => json([session()]));
    render(<SessionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy resume" }));
    expect(await screen.findByRole("textbox")).toHaveValue(session().resume_command);
  });
});

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead, json } from "@/features/beads/beadFixtures";
import { JumpPalette } from "./JumpPalette";

const projects = [
  { name: "alpha", path: "/a", exists: true, beads: null },
  { name: "beta", path: "/b", exists: true, beads: null },
];

function stub(overrides: Record<string, () => Response> = {}) {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>((url) => {
    if (url === "/api/projects/beads") return Promise.resolve(json(projects));
    for (const [project, make] of Object.entries(overrides)) if (url.includes(`project=${project}`)) return Promise.resolve(make());
    if (url.includes("project=alpha")) {
      return Promise.resolve(json([bead("a-1", { title: "Login page" }), bead("a-2", { title: "Login old", status: "closed" })]));
    }
    return Promise.resolve(json([bead("b-1", { title: "Billing" })]));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const open = (init: KeyboardEventInit = { key: "k", ctrlKey: true }) => {
  const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

beforeEach(() => window.history.replaceState(null, "", "/beads"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("JumpPalette", () => {
  it("REQ-UI-154 Ctrl+K opens the palette with the search focused and prevents the browser default", async () => {
    stub();
    render(<JumpPalette />);
    const event = open();
    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByRole("dialog", { name: "Jump to a bead" })).toBeTruthy();
    expect(document.activeElement).toBe(await screen.findByRole("textbox", { name: "Search beads" }));
    expect(await screen.findByText("Type an id or a title")).toBeTruthy();
  });

  it("REQ-UI-154 Cmd+K opens it too, also from another focused input", async () => {
    stub();
    render(
      <>
        <input aria-label="other" />
        <JumpPalette />
      </>,
    );
    screen.getByLabelText("other").focus();
    open({ key: "K", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("REQ-UI-154 other modifiers or keys do nothing", () => {
    stub();
    render(<JumpPalette />);
    expect(open({ key: "k", ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
    expect(open({ key: "k", ctrlKey: true, altKey: true }).defaultPrevented).toBe(false);
    expect(open({ key: "k" }).defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("REQ-UI-154 Escape closes it", async () => {
    stub();
    render(<JumpPalette />);
    open();
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("REQ-UI-154 shows Loading beads while loading, then results with project, open before closed", async () => {
    stub();
    render(<JumpPalette />);
    open();
    expect(await screen.findByText("Loading beads…")).toBeTruthy();
    await screen.findByText("Type an id or a title");
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "login");
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("a-1"),
      expect.stringContaining("a-2"),
    ]);
    expect(options[0].textContent).toContain("alpha");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[1].getAttribute("aria-selected")).toBe("false");
  });

  it("REQ-UI-154 says No beads match", async () => {
    stub();
    render(<JumpPalette />);
    open();
    await screen.findByText("Type an id or a title");
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "zzz");
    expect(await screen.findByText("No beads match")).toBeTruthy();
  });

  it("REQ-UI-154 limits the results to 20", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url === "/api/projects/beads"
            ? json([projects[0]])
            : json(Array.from({ length: 30 }, (_, i) => bead(`a-${i}`))),
        ),
      ),
    );
    render(<JumpPalette />);
    open();
    await screen.findByText("Type an id or a title");
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "a-");
    expect(await screen.findAllByRole("option")).toHaveLength(20);
  });

  it("REQ-UI-154 one failing project is named and the others still answer", async () => {
    stub({ beta: () => json({ error: "boom" }, 500) });
    render(<JumpPalette />);
    open();
    expect(await screen.findByText("Could not load beta")).toBeTruthy();
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "a-1");
    expect(await screen.findAllByRole("option")).toHaveLength(1);
  });

  it("REQ-UI-154 arrows move the selection and Enter opens the bead and closes", async () => {
    stub();
    render(<JumpPalette />);
    open();
    await screen.findByText("Type an id or a title");
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "login");
    await screen.findAllByRole("option");
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{ArrowUp}{ArrowDown}{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/a-2");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("REQ-UI-154 a click opens the bead of its project", async () => {
    stub();
    render(<JumpPalette />);
    open();
    await screen.findByText("Type an id or a title");
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "billing");
    fireEvent.click(await screen.findByRole("option"));
    expect(window.location.pathname).toBe("/beads/beta/b-1");
  });

  it("REQ-UI-154 a second opening sends no request; a new key loads again", async () => {
    const fetchMock = stub();
    const { rerender } = render(<JumpPalette key={0} />);
    open();
    await screen.findByText("Type an id or a title");
    const calls = fetchMock.mock.calls.length;
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    open();
    await screen.findByText("Type an id or a title");
    expect(fetchMock.mock.calls.length).toBe(calls);
    rerender(<JumpPalette key={1} />);
    open();
    await screen.findByText("Type an id or a title");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
  });

  it("REQ-UI-154 reopening after a failed project list loads again", async () => {
    let ok = false;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/projects/beads") return Promise.resolve(ok ? json(projects) : json({ error: "down" }, 500));
      return Promise.resolve(json([bead("a-1")]));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<JumpPalette />);
    open();
    await screen.findByText("Could not load projects");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    ok = true;
    open();
    await userEvent.type(await screen.findByRole("textbox", { name: "Search beads" }), "a-1");
    expect((await screen.findAllByRole("option")).length).toBeGreaterThan(0);
  });

  it("REQ-UI-154 reopening shows an empty field and the hint", async () => {
    stub();
    render(<JumpPalette />);
    open();
    await screen.findByText("Type an id or a title");
    await userEvent.type(screen.getByRole("textbox", { name: "Search beads" }), "login");
    await screen.findAllByRole("option");
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    open();
    const input = await screen.findByRole("textbox", { name: "Search beads" });
    expect((input as HTMLInputElement).value).toBe("");
    expect(await screen.findByText("Type an id or a title")).toBeTruthy();
  });

  it("REQ-UI-154 removes its listener on unmount", () => {
    stub();
    const { unmount } = render(<JumpPalette />);
    unmount();
    expect(open().defaultPrevented).toBe(false);
  });
});

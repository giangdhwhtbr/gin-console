import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json } from "./beadFixtures";
import { DetailsPanel } from "./DetailsPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stub = (overrides: Partial<BeadSummary> = {}, extra: Record<string, unknown> = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/comments")) return Promise.resolve(json([]));
      return Promise.resolve(
        json({
          ...bead("t-1", { title: "Task One", ...overrides }),
          description: null,
          design: null,
          notes: null,
          acceptance_criteria: null,
          close_reason: null,
          dependencies: [],
          dependents: [],
          children: [],
          bugs: [],
          ...extra,
        }),
      );
    }),
  );

describe("DetailsPanel", () => {
  it("REQ-UI-045 landmark, close button, note and embedded bead", async () => {
    stub();
    const onClose = vi.fn();
    render(<DetailsPanel project="alpha" id="t-1" note="Not in the current list" onClose={onClose} />);

    expect(screen.getByRole("complementary", { name: "Bead details" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Not in the current list")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Task One" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("REQ-UI-045 no note when none is given", () => {
    stub();
    render(<DetailsPanel project="alpha" id="t-1" onClose={() => {}} />);
    expect(screen.queryByText("Not in the current list")).toBeNull();
  });

  it("REQ-UI-115 Chip in every view (details panel) and REQ-UI-116 gate words", async () => {
    stub({ lane: "be", track: { plan: null, number: 3 } });
    render(<DetailsPanel project="alpha" id="t-1" onClose={() => {}} />);
    expect((await screen.findAllByText("be")).filter((el) => el.previousElementSibling?.matches(".size-2.rounded-full") === true)).toHaveLength(1);
    expect(screen.getByText("#3")).toBeInTheDocument();
    cleanup();
    stub({ waits_for: { plan: "p.md", number: 2, track_id: null, lane: "be" } });
    render(<DetailsPanel project="alpha" id="t-1" onClose={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Waits for be #2 to merge" })).toBeInTheDocument();
  });

  it("REQ-UI-053 Details panel: a task with a blocker offers View in graph", async () => {
    stub({ parent: "e-1" }, { dependencies: [{ id: "x", title: "X", status: "open", type: "blocks" }] });
    render(<DetailsPanel project="alpha" id="t-1" onClose={vi.fn()} />);
    expect(await screen.findByRole("link", { name: "View in graph" })).toHaveAttribute(
      "href",
      "/beads?project=alpha&view=graph&scope=e-1&select=t-1",
    );
  });

  it("REQ-UI-149 Show children sits next to Open page and calls back", async () => {
    stub();
    const onShowChildren = vi.fn();
    render(<DetailsPanel project="alpha" id="t-1" onShowChildren={onShowChildren} onClose={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Show children" });
    expect(screen.getByRole("link", { name: "Open page" }).parentElement).toContainElement(button);
    await userEvent.click(button);
    expect(onShowChildren).toHaveBeenCalledTimes(1);
  });

  it("REQ-UI-149 Not in the List: no Show children without the callback", () => {
    stub();
    render(<DetailsPanel project="alpha" id="t-1" onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Show children" })).toBeNull();
  });

  it("REQ-UI-053 Graph view panel: no View in graph, and the List panel keeps it", async () => {
    const children = [{ id: "c", title: "C", status: "open", type: "parent-child", prep: false }];
    stub({}, { children });
    render(<DetailsPanel project="alpha" id="t-1" graphLink={false} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: "Task One" });
    expect(screen.queryByRole("link", { name: "View in graph" })).toBeNull();
    cleanup();
    stub({}, { children });
    render(<DetailsPanel project="alpha" id="t-1" onClose={vi.fn()} />);
    expect(await screen.findByRole("link", { name: "View in graph" })).toBeInTheDocument();
  });

  it("REQ-UI-148 No panel under 1024px", () => {
    stub();
    render(<DetailsPanel project="alpha" id="t-1" onClose={vi.fn()} />);
    expect(screen.getByRole("complementary", { name: "Bead details" })).toHaveClass("hidden", "lg:block");
  });
});

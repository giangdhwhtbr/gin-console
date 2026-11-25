import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "@/features/beads/beadFixtures";
import type { BeadSummary } from "@/features/beads/api";
import { MyWorkGroup } from "./MyWorkGroup";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stubWidth = (px: number) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Number(/min-width: (\d+)px/.exec(query)?.[1]) <= px,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
const blocker = bead("t-9", { title: "Set up CI", assignee: "bob" });
const held = bead("t-1", { assignee: "ann", blocked: true, blocked_by: ["t-9", "t-10"] });
const known = new Map<string, BeadSummary>([[blocker.id, blocker], [held.id, held]]);
const show = (key: "blocked" | "waiting") =>
  render(<MyWorkGroup group={{ key, title: key, beads: [held] }} project="alpha" known={known} email="ann@x.com" />);

describe("MyWorkGroup", () => {
  it("REQ-UI-100 REQ-UI-153 a Blocked card names the first blocker by id and +n at 390px", () => {
    stubWidth(390);
    show("blocked");
    expect(screen.getByText("Blocked by Set up CI +1")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.getByRole("link", { name: "Title t-1" })).toHaveAttribute("href", "/beads/alpha/t-1");
  });

  it("REQ-UI-100 REQ-UI-153 a Blocked row at 768px shows the blocker text in a table", () => {
    stubWidth(768);
    show("blocked");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Blocked by Set up CI +1")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("REQ-UI-100 a Waiting on me row says Waits on my blocking bead", () => {
    stubWidth(1024);
    const mine = bead("t-9", { title: "Design tokens", assignee: "ann" });
    render(
      <MyWorkGroup
        group={{ key: "waiting", title: "Waiting on me", beads: [bead("t-2", { assignee: "bob", blocked_by: ["t-9"] })] }}
        project="alpha"
        known={new Map([[mine.id, mine]])}
        email="ann@x.com"
      />,
    );
    expect(screen.getByText("Waits on Design tokens")).toBeInTheDocument();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Relation } from "./api";
import { RelationList } from "./RelationList";

afterEach(cleanup);

const gate = (id: string, status: string, lane: string | null, number: number): Relation => ({
  id,
  title: "placeholder title",
  status,
  type: "blocks",
  waits_for: { plan: "p.md", number, track_id: null, lane },
});

describe("RelationList", () => {
  it("REQ-UI-116 Dependencies of a track", () => {
    render(
      <RelationList
        title="Depends on"
        project="alpha"
        items={[gate("a-1", "open", "be", 2), gate("a-2", "closed", "fe", 3), gate("a-3", "open", null, 7)]}
      />,
    );
    expect(screen.getByText("Waits for be #2, merge pending")).toBeInTheDocument();
    expect(screen.getByText("Waits for fe #3, merged")).toBeInTheDocument();
    expect(screen.getByText("Waits for track 7, merge pending")).toBeInTheDocument();
    expect(screen.queryByText("placeholder title")).toBeNull();
    expect(screen.queryByText("Open")).toBeNull();
  });

  it("REQ-UI-028 a plain relation keeps its title and status", () => {
    render(
      <RelationList title="Depends on" project="alpha" items={[{ id: "a-9", title: "Plain", status: "in_progress", type: "blocks" }]} />,
    );
    expect(screen.getByText("Plain")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });
});

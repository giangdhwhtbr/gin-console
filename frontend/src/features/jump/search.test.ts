import { describe, expect, it } from "vitest";
import { bead } from "@/features/beads/beadFixtures";
import { searchBeads, type Entry } from "./search";

const entry = (id: string, o: Parameters<typeof bead>[1] = {}, project = "alpha"): Entry => ({ project, bead: bead(id, o) });

describe("searchBeads", () => {
  it("REQ-UI-154 empty or blank text gives nothing", () => {
    expect(searchBeads([entry("a-1")], "  ")).toEqual([]);
  });

  it("REQ-UI-154 matches id or title, ignoring case and spaces around", () => {
    const entries = [entry("a-1", { title: "Fix LOGIN" }), entry("b-2", { title: "Other" })];
    expect(searchBeads(entries, " login ").map((e) => e.bead.id)).toEqual(["a-1"]);
    expect(searchBeads(entries, "B-2").map((e) => e.bead.id)).toEqual(["b-2"]);
  });

  it("REQ-UI-154 orders exact id, then open, then closed, then by id", () => {
    const entries = [
      entry("x-10", { title: "t" }),
      entry("x-2", { title: "t", status: "closed" }),
      entry("x-1", { title: "t" }),
      entry("x-9", { title: "x-1 mention" }),
      entry("x-1a", { title: "t", status: "closed" }),
    ];
    expect(searchBeads(entries, "x-1").map((e) => e.bead.id)).toEqual(["x-1", "x-9", "x-10", "x-1a"]);
  });

  it("REQ-UI-154 returns at most 20", () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry(`a-${i}`));
    expect(searchBeads(entries, "a-")).toHaveLength(20);
  });

  it("REQ-UI-154 leaves out merge gates", () => {
    const gate = entry("g-1", { waits_for: { plan: "p", number: 1, track_id: null, lane: null } });
    expect(searchBeads([gate], "g-1")).toEqual([]);
  });
});

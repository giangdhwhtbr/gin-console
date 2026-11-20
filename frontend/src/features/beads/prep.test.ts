import { describe, expect, it } from "vitest";
import { childCounts, isPrep, prepLabel } from "./prep";

describe("prep", () => {
  it("REQ-BEADS-002 a prep task has the prep label and no track: or req: label", () => {
    expect(isPrep(["prep", "prep:mockup"])).toBe(true);
    expect(isPrep(["prep", "track:api"])).toBe(false);
    expect(isPrep(["prep", "req:REQ-1"])).toBe(false);
    expect(isPrep(["prep:mockup"])).toBe(false);
    expect(isPrep([])).toBe(false);
  });

  it("REQ-UI-044 counts tracks and prep apart and labels prep as x/y", () => {
    const counts = childCounts([
      { labels: [], status: "closed" },
      { labels: [], status: "open" },
      { labels: ["prep", "prep:mockup"], status: "open" },
      { labels: ["prep", "track:api"], status: "closed" },
    ]);
    expect(counts).toEqual({ tracks: 3, closedTracks: 2, prep: 1, closedPrep: 0 });
    expect(prepLabel(counts)).toBe("Prep 0/1");
    expect(prepLabel(childCounts([{ labels: [], status: "open" }]))).toBeNull();
  });
});

describe("childCounts merge gates", () => {
  it("REQ-UI-116 Not counted as a child: an item with waits_for is skipped", () => {
    const gate = { labels: [], status: "open", waits_for: { plan: "p", number: 1, track_id: null, lane: null } };
    expect(childCounts([{ labels: [], status: "closed" }, gate])).toEqual({ tracks: 1, closedTracks: 1, prep: 0, closedPrep: 0 });
  });
});

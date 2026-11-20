import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { gateState, gateTarget, gateWords, isMergeGate, withoutMergeGates } from "./mergeGates";

const gate = (id: string, ref: { plan: string; number: number; track_id: string | null; lane: string | null }, status = "open") =>
  bead(id, { title: `external: ${ref.plan}#${ref.number}`, status, waits_for: ref });

describe("mergeGates", () => {
  it("REQ-UI-116 a bead with waits_for is a merge gate and is dropped from lists", () => {
    const g = gate("g-1", { plan: "be", number: 2, track_id: "t-2", lane: "be" });
    const task = bead("t-2");
    expect(isMergeGate(g)).toBe(true);
    expect(isMergeGate(task)).toBe(false);
    expect(isMergeGate({})).toBe(false);
    expect(withoutMergeGates([g, task])).toEqual([task]);
  });

  it("REQ-UI-116 gateTarget finds the track by track_id, or null", () => {
    const track = bead("t-2");
    expect(gateTarget(gate("g-1", { plan: "be", number: 2, track_id: "t-2", lane: null }), [track])).toBe(track);
    expect(gateTarget(gate("g-1", { plan: "be", number: 2, track_id: null, lane: null }), [track])).toBeNull();
    expect(gateTarget(gate("g-1", { plan: "be", number: 2, track_id: "zz", lane: null }), [track])).toBeNull();
    expect(gateTarget(track, [track])).toBeNull();
  });

  it("REQ-UI-116 gateWords names the lane and track, or the track alone", () => {
    expect(gateWords({ plan: "be", number: 2, track_id: "t-2", lane: "be" })).toBe("be #2");
    expect(gateWords({ plan: "p.md", number: 7, track_id: null, lane: null })).toBe("track 7");
  });

  it("REQ-UI-116 the state word is Merged when closed, else Waiting", () => {
    expect(gateState("closed")).toBe("Merged");
    expect(gateState("open")).toBe("Waiting");
    expect(gateState("in_progress")).toBe("Waiting");
  });
});

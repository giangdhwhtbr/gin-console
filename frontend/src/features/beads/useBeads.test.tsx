import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { useBeads } from "./useBeads";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const BEADS = [bead("m-1", { issue_type: "milestone" }), bead("e-a", { issue_type: "epic", parent: "m-1" })];

async function idsOf(keep?: boolean) {
  stubBeads(() => json(BEADS));
  const { result } = renderHook(() => useBeads("alpha", true, keep));
  await waitFor(() => expect(result.current.state.status).toBe("ok"));
  const state = result.current.state;
  return state.status === "ok" ? state.beads.map((b) => b.id) : [];
}

describe("useBeads", () => {
  it("REQ-MILESTONE-UI-009 drops milestone beads, so their epics have no loaded parent", async () => {
    expect(await idsOf()).toEqual(["e-a"]);
  });

  it("keeps milestone beads when keepMilestones is true", async () => {
    expect(await idsOf(true)).toEqual(["m-1", "e-a"]);
  });
});

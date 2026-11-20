import { describe, expect, it } from "vitest";
import { leaseOf, trackText, visibleLabels } from "./laneFacts";
import { factDate } from "@/lib/dates";

describe("laneFacts", () => {
  it("REQ-UI-115 labels drop lane:<x> with a lane and track:<n> with a track", () => {
    const labels = ["lane:be", "track:2", "prep", "x"];
    expect(visibleLabels({ labels, lane: "be", track: { plan: null, number: 2 } })).toEqual(["prep", "x"]);
    expect(visibleLabels({ labels, lane: null, track: null })).toEqual(labels);
  });

  it("REQ-UI-115 trackText shows the number and the plan file name", () => {
    expect(trackText({ plan: "docs/plans/2026-11-17-team-checkout.md", number: 2 })).toBe("#2 2026-11-17-team-checkout.md");
    expect(trackText({ plan: null, number: 3 })).toBe("#3");
  });

  it("REQ-UI-115 leaseOf takes the latest expiry: until when ahead, expired when past", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    const a = { holder: "a", expires_at: "2026-11-20T12:00:00Z" };
    const b = { holder: "b", expires_at: "2026-11-21T12:00:00Z" };
    expect(leaseOf([a, null, b], now)).toEqual({ text: `until ${factDate(b.expires_at)}`, expired: false });
    const old = { holder: "a", expires_at: "2026-11-18T09:00:00Z" };
    expect(leaseOf([old], now)).toEqual({ text: `expired ${factDate(old.expires_at)}`, expired: true });
    expect(leaseOf([null], now)).toBeNull();
    expect(leaseOf([], now)).toBeNull();
  });
});

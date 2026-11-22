import { describe, expect, it } from "vitest";
import { lateOf } from "./late";

// REQ-MILESTONE-UI-023
describe("lateOf", () => {
  it("REQ-MILESTONE-UI-023 forecast after the end", () => {
    expect(lateOf({ status: "active", end: "2026-12-01", finish: "2027-02-16" }, "2026-11-21")).toBe(true);
  });

  it("REQ-MILESTONE-UI-023 today after the end", () => {
    expect(lateOf({ status: "active", end: "2026-11-20", finish: null }, "2026-11-21")).toBe(true);
    expect(lateOf({ status: "scheduled", end: "2026-11-20" }, "2026-11-21")).toBe(true);
  });

  it("REQ-MILESTONE-UI-023 on time: forecast on the end, today on the end", () => {
    expect(lateOf({ status: "active", end: "2026-12-01", finish: "2026-12-01" }, "2026-12-01")).toBe(false);
    expect(lateOf({ status: "active", end: "2026-12-01", finish: "2026-11-27" }, "2026-11-21")).toBe(false);
  });

  it("REQ-MILESTONE-UI-023 closed: late by the day it closed, never by today or the forecast", () => {
    expect(lateOf({ status: "closed", end: "2026-11-10", closedOn: "2026-11-12" }, "2026-11-21")).toBe(true);
    expect(lateOf({ status: "closed", end: "2026-11-10", closedOn: "2026-11-10" }, "2026-11-21")).toBe(false);
    expect(lateOf({ status: "closed", end: "2026-11-10", closedOn: null, finish: "2026-12-01" }, "2026-11-21")).toBe(false);
    expect(lateOf({ status: "closed", end: "2026-11-10" }, "2026-11-21")).toBe(false);
  });

  it("REQ-MILESTONE-UI-023 no end is never late; times compare by their day", () => {
    expect(lateOf({ status: "active", end: null, finish: "2027-01-01" }, "2026-11-21")).toBe(false);
    expect(lateOf({ status: "active", end: "2026-12-01", finish: "2026-12-01T18:00:00Z" }, "2026-11-21")).toBe(false);
    expect(lateOf({ status: "closed", end: "2026-12-01", closedOn: "2026-12-01T23:00:00Z" }, "2026-12-05")).toBe(false);
  });
});

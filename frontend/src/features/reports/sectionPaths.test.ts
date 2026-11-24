import { describe, expect, it } from "vitest";
import { SECTION_LABELS, SECTIONS, legacyTarget, sectionOf, sectionPath } from "./sections";

describe("report sections", () => {
  it("REQ-UI-095 lists Status, Team, Delivery, Velocity and Rework in that order", () => {
    expect(SECTIONS).toEqual(["status", "team", "delivery", "velocity", "rework"]);
    expect(SECTIONS.map((s) => SECTION_LABELS[s])).toEqual(["Status", "Team", "Delivery", "Velocity", "Rework"]);
  });

  it("REQ-UI-095 each section has its own path with the same query", () => {
    expect(sectionPath("rework", "?project=alpha&days=7")).toBe("/reports/rework?project=alpha&days=7");
    expect(sectionPath("status", "")).toBe("/reports/status");
  });

  it("REQ-UI-095 reads the section of a path", () => {
    expect(sectionOf("/reports")).toBe("index");
    expect(sectionOf("/reports/")).toBe("index");
    for (const section of SECTIONS) expect(sectionOf(`/reports/${section}`)).toBe(section);
  });

  it("REQ-UI-095 unknown section: a path under /reports/ naming no section", () => {
    expect(sectionOf("/reports/nope")).toBe("unknown");
    expect(sectionOf("/reports/quality")).toBe("unknown");
    expect(sectionOf("/reports/team/x")).toBe("unknown");
  });

  it("REQ-UI-095 old tab links go to their section, dropping tab and keeping the rest of the query", () => {
    expect(legacyTarget("/reports", "?project=alpha&days=7&tab=quality")).toBe("/reports/rework?project=alpha&days=7");
    expect(legacyTarget("/reports", "?project=alpha&tab=coverage")).toBe("/reports/status?project=alpha");
    expect(legacyTarget("/reports", "?project=alpha&tab=usage")).toBe("/reports/status?project=alpha");
    expect(legacyTarget("/reports", "?project=alpha")).toBe("/reports/status?project=alpha");
    expect(legacyTarget("/reports", "")).toBe("/reports/status");
    expect(legacyTarget("/reports", "?project=alpha&tab=delivery&milestone=m1")).toBe("/reports/delivery?project=alpha&milestone=m1");
    expect(legacyTarget("/reports/team", "?project=alpha&tab=quality")).toBe("/reports/rework?project=alpha");
  });

  it("REQ-UI-095 a section path without tab needs no rewrite", () => {
    expect(legacyTarget("/reports/delivery", "?project=alpha&days=7")).toBeNull();
    expect(legacyTarget("/reports/nope", "?project=alpha")).toBeNull();
  });
});

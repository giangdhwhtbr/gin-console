import { describe, expect, it } from "vitest";
import type { EpicWorkflow } from "@/features/projects/api";
import { gateIssues, waiversOf } from "./gates";

const workflow = (gates: Record<string, string>, review_waivers: EpicWorkflow["review_waivers"] = []): EpicWorkflow => ({
  stage: "execute",
  gates,
  warnings: [],
  review_waivers,
});

describe("gates", () => {
  it("REQ-OVERVIEW-008 lists an epic started before its plan, not one with only late gates unmet", () => {
    expect(gateIssues(workflow({ requirement_confirmed: "met", plan_approved: "unmet" }))).toEqual(["plan_approved"]);
    expect(gateIssues(workflow({ plan_approved: "met", implementation_complete: "unmet", shipped: "unmet" }))).toEqual([]);
  });

  it("REQ-OVERVIEW-008 names a gate that is unknown", () => {
    expect(gateIssues(workflow({ shipped: "unknown", plan_approved: "met" }))).toEqual(["shipped (unknown)"]);
  });

  it("REQ-OVERVIEW-008 lists waived gates with their reason, then review waivers", () => {
    const wf = workflow({ plan_approved: "waived(hotfix)", shipped: "unmet" }, [{ task_id: "e-1.2", reason: "no reviewer", actor: "x" }]);
    expect(waiversOf(wf)).toEqual([
      { subject: "plan_approved", reason: "hotfix" },
      { subject: "e-1.2", reason: "no reviewer" },
    ]);
  });

  it("REQ-OVERVIEW-008 reads a waived gate without a reason", () => {
    expect(waiversOf(workflow({ plan_approved: "waived" }))).toEqual([{ subject: "plan_approved", reason: "" }]);
  });
});

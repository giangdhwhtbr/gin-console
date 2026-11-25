import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChange, fetchChanges, fetchMockups, fetchRequirements, fetchScenarios, RequirementsFailure } from "./api";
import { jsonResponse, listOf, requirement } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());
const stub = (response: Response) => vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(response)));

const folder = { folder: "f", change: "c", title: "T", epic: null, archived: null };
const cases: [string, () => Promise<unknown>, unknown][] = [
  ["requirements", () => fetchRequirements("a"), listOf(requirement())],
  ["scenarios", () => fetchScenarios("a", "R"), { id: "R", title: "t", source: null, scenarios: [{ title: "s", given: [], when: [], then: [] }] }],
  ["changes", () => fetchChanges("a"), { changes: [{ ...folder, signoff: null, added: 1, modified: null, removed: 0 }], error: null, cause: null }],
  ["change", () => fetchChange("a", "f"), { ...folder, files: { "proposal.md": "x" } }],
  ["mockups", () => fetchMockups("a"), { mockups: [] }],
];

describe("requirements api", () => {
  it.each(cases)("REQ-REQUIREMENTS-019 %s returns a valid body", async (_name, call, body) => {
    stub(jsonResponse(body));
    await expect(call()).resolves.toEqual(body);
  });
  it.each(cases)("REQ-REQUIREMENTS-019 %s rejects a malformed body", async (_name, call) => {
    stub(jsonResponse({ nope: 1 }));
    await expect(call()).rejects.toThrow("unexpected response");
  });
  it("REQ-REQUIREMENTS-019 a 502 carries the error text and cause", async () => {
    stub(jsonResponse({ error: "gin is too old", cause: "outdated" }, 502));
    const failure = await fetchRequirements("a").catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(RequirementsFailure);
    expect(failure).toMatchObject({ message: "gin is too old", kind: "outdated", status: 502 });
  });
});

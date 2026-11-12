import { afterEach, describe, expect, it, vi } from "vitest";
import { BeadNotFoundError, fetchBead, fetchBeads, fetchComments, fetchMilestones } from "./api";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const sampleSummary = {
  id: "a-1",
  title: "Test Bead",
  status: "open",
  priority: 1,
  issue_type: "bug",
  labels: ["qa"],
  owner: "alice",
  assignee: "bob",
  parent: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  closed_at: null,
  ready: false,
  blocked: false,
  created_by: null,
  blocked_by: [],
  milestone: null,
};

const sampleDetail = {
  ...sampleSummary,
  description: "Detailed description",
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [{ id: "b-1", title: "Dep", status: "open", type: "blocks" }],
  dependents: [],
  children: [],
  bugs: [],
};

const sampleComment = {
  id: "c-1",
  author: "alice",
  text: "Sample comment",
  created_at: "2026-10-01T00:00:00Z",
  truncated: false,
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("api", () => {
  // REQ-UI-029: list url and closed parameter
  it("REQ-UI-029 requests the beads endpoint with URL encoding and closed flag", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json([sampleSummary])));
    vi.stubGlobal("fetch", fetchMock);

    await fetchBeads("proj", false);
    expect(fetchMock).toHaveBeenCalledWith("/api/beads?project=proj");

    await fetchBeads("a b", true);
    expect(fetchMock).toHaveBeenCalledWith("/api/beads?project=a%20b&closed=1");
  });

  // REQ-UI-029: valid list resolution
  it("REQ-UI-029 resolves a valid list of beads", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([sampleSummary]))));
    const result = await fetchBeads("proj", false);
    expect(result).toEqual([sampleSummary]);
  });

  // REQ-UI-029: unexpected shape - non-array body
  it("REQ-UI-029 rejects when the list body is not an array", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ not: "an array" }))));
    await expect(fetchBeads("proj", false)).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-029: unexpected shape - priority as string
  it("REQ-UI-029 rejects when a bead priority is a string", async () => {
    const invalidItem = { ...sampleSummary, priority: "1" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([invalidItem]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-029: unexpected shape - labels not string array
  it("REQ-UI-029 rejects when bead labels is not an array of strings", async () => {
    const invalidItem = { ...sampleSummary, labels: [123] };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([invalidItem]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-029: unexpected shape - item missing title
  it("REQ-UI-029 rejects when a bead is missing title", async () => {
    const missingTitle = Object.fromEntries(
      Object.entries(sampleSummary).filter(([key]) => key !== "title"),
    );
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([missingTitle]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-029: unexpected shape - item missing ready
  it("REQ-UI-029 rejects when a bead is missing ready", async () => {
    const missingReady = Object.fromEntries(
      Object.entries(sampleSummary).filter(([key]) => key !== "ready"),
    );
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([missingReady]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-UI-029: unexpected shape - ready is not boolean
  it("REQ-UI-029 rejects when a bead ready flag is a string", async () => {
    const invalidReady = { ...sampleSummary, ready: "yes" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([invalidReady]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-UI-029: unexpected shape - closed_at is number
  it("REQ-UI-029 rejects when closed_at is a number", async () => {
    const invalidClosedAt = { ...sampleSummary, closed_at: 5 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([invalidClosedAt]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-BEADS-010
  it("REQ-BEADS-010 rejects when a bead is missing blocked_by", async () => {
    const missingBlockedBy = Object.fromEntries(
      Object.entries(sampleSummary).filter(([key]) => key !== "blocked_by"),
    );
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([missingBlockedBy]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-BEADS-010
  it("REQ-BEADS-010 rejects when blocked_by is a string or non-string array", async () => {
    const stringBlockedBy = { ...sampleSummary, blocked_by: "a-1" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([stringBlockedBy]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");

    const numberArrayBlockedBy = { ...sampleSummary, blocked_by: [1] };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([numberArrayBlockedBy]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-BEADS-010
  it("REQ-BEADS-010 accepts blocked_by as an array of strings", async () => {
    const valid = { ...sampleSummary, blocked_by: ["a-1", "a-2"] };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([valid]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([valid]);
  });

  // REQ-UI-029: valid closed_at
  it("REQ-UI-029 accepts closed_at as null or string", async () => {
    const withNull = { ...sampleSummary, closed_at: null };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withNull]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withNull]);

    const withString = { ...sampleSummary, closed_at: "2026-10-15T00:00:00Z" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withString]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withString]);
  });

  // REQ-UI-104
  it("REQ-UI-104 reads a bead milestone, and a missing one as null", async () => {
    const withMilestone = { ...sampleSummary, milestone: "m2" };
    const old = Object.fromEntries(Object.entries(sampleSummary).filter(([key]) => key !== "milestone"));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withMilestone, old]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withMilestone, sampleSummary]);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([{ ...sampleSummary, milestone: 5 }]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-104
  it("REQ-UI-104 fetchMilestones requests the endpoint and checks the shape", async () => {
    const body = {
      milestones: [{ id: "m1", title: "One", status: "active", start: "2026-10-01", end: null }],
      current: "m1",
    };
    const fetchMock = vi.fn(() => Promise.resolve(json(body)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMilestones("a b")).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith("/api/beads/milestones?project=a%20b");

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ current: null }))));
    await expect(fetchMilestones("p")).rejects.toThrow(/unexpected response/);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ milestones: [{ id: "m" }], current: null }))));
    await expect(fetchMilestones("p")).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-104
  it("REQ-UI-104 fetchMilestones maps 404 and 502", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({}, 404))));
    await expect(fetchMilestones("p")).rejects.toThrow(/not found/i);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "bd failed" }, 502))));
    await expect(fetchMilestones("p")).rejects.toThrow("bd failed");
  });

  // REQ-UI-029: 502 with error body
  it("REQ-UI-029 rejects with the exact error message from 502 response", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "bd not found" }, 502))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("bd not found");
  });

  // REQ-UI-029: 404 rejects with /not found/i
  it("REQ-UI-029 rejects with not found on 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ detail: "Not found" }, 404))));
    await expect(fetchBeads("proj", false)).rejects.toThrow(/not found/i);
  });

  // REQ-UI-029: detail request encoding and success
  it("REQ-UI-029 requests bead detail with encoded project and bead id", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(sampleDetail)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBead("p", "a-1");
    expect(fetchMock).toHaveBeenCalledWith("/api/beads/p/a-1");
    expect(result).toEqual(sampleDetail);

    await fetchBead("p", "a/b");
    expect(fetchMock).toHaveBeenCalledWith("/api/beads/p/a%2Fb");
  });

  // REQ-UI-029: detail 404 throws BeadNotFoundError
  it("REQ-UI-029 rejects with BeadNotFoundError when bead detail returns 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({}, 404))));
    await expect(fetchBead("p", "missing")).rejects.toBeInstanceOf(BeadNotFoundError);
  });

  // REQ-UI-029: detail unexpected shape - dependencies not an array
  it("REQ-UI-029 rejects when bead dependencies is not an array", async () => {
    const invalidDetail = { ...sampleDetail, dependencies: "none" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(invalidDetail))));
    await expect(fetchBead("p", "a-1")).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-029: detail unexpected shape - unknown relation type
  it("REQ-UI-029 rejects when a dependency has an unknown type", async () => {
    const invalidDetail = {
      ...sampleDetail,
      dependencies: [{ id: "b-1", title: "Dep", status: "open", type: "related" }],
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(invalidDetail))));
    await expect(fetchBead("p", "a-1")).rejects.toThrow(/unexpected response/);
  });

  // REQ-UI-038: summary missing created_by
  it("REQ-UI-038 rejects when a bead is missing created_by", async () => {
    const missingCreatedBy = Object.fromEntries(
      Object.entries(sampleSummary).filter(([key]) => key !== "created_by"),
    );
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([missingCreatedBy]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-UI-038: summary created_by not string or null
  it("REQ-UI-038 rejects when a bead created_by is a number", async () => {
    const invalidCreatedBy = { ...sampleSummary, created_by: 5 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([invalidCreatedBy]))));
    await expect(fetchBeads("proj", false)).rejects.toThrow("Could not load beads (unexpected response)");
  });

  // REQ-UI-038: summary accepts created_by as null or string
  it("REQ-UI-038 accepts created_by as null or string", async () => {
    const withNull = { ...sampleSummary, created_by: null };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withNull]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withNull]);

    const withString = { ...sampleSummary, created_by: "alice" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withString]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withString]);
  });

  // REQ-UI-038: detail design is number
  it("REQ-UI-038 rejects when bead detail design is a number", async () => {
    const invalidDetail = { ...sampleDetail, design: 5 };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(invalidDetail))));
    await expect(fetchBead("p", "a-1")).rejects.toThrow("Could not load the bead (unexpected response)");
  });

  // REQ-UI-038: detail missing notes, acceptance_criteria, or close_reason
  it("REQ-UI-038 rejects when bead detail is missing notes, acceptance_criteria, or close_reason", async () => {
    for (const fieldName of ["notes", "acceptance_criteria", "close_reason"] as const) {
      const missingField = Object.fromEntries(
        Object.entries(sampleDetail).filter(([key]) => key !== fieldName),
      );
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(missingField))));
      await expect(fetchBead("p", "a-1")).rejects.toThrow("Could not load the bead (unexpected response)");
    }
  });

  // REQ-UI-038: detail accepts four text fields as null or string
  it("REQ-UI-038 accepts detail text fields as null or string", async () => {
    const withNulls = {
      ...sampleDetail,
      design: null,
      notes: null,
      acceptance_criteria: null,
      close_reason: null,
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(withNulls))));
    await expect(fetchBead("p", "a-1")).resolves.toEqual(withNulls);

    const withStrings = {
      ...sampleDetail,
      design: "Design text",
      notes: "Notes text",
      acceptance_criteria: "AC text",
      close_reason: "Done",
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(withStrings))));
    await expect(fetchBead("p", "a-1")).resolves.toEqual(withStrings);
  });

  // REQ-UI-039: fetchComments requests endpoint with URL encoding and returns parsed comments
  it("REQ-UI-039 requests comments with URL encoding and returns parsed comments", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json([sampleComment])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchComments("my proj", "a/1");
    expect(fetchMock).toHaveBeenCalledWith("/api/beads/my%20proj/a%2F1/comments");
    expect(result).toEqual([sampleComment]);
  });

  // REQ-UI-040: comments 404 throws BeadNotFoundError
  it("REQ-UI-040 rejects with BeadNotFoundError when comments return 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({}, 404))));
    await expect(fetchComments("proj", "a-1")).rejects.toBeInstanceOf(BeadNotFoundError);
  });

  // REQ-UI-040: comments 502 with error message
  it("REQ-UI-040 rejects with error message on 502", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "bd comments failed" }, 502))));
    await expect(fetchComments("proj", "a-1")).rejects.toThrow("bd comments failed");
  });

  // REQ-UI-040: malformed comments responses
  it("REQ-UI-040 rejects when comments response is not an array or has malformed comments", async () => {
    // body {"x": 1}
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ x: 1 }))));
    await expect(fetchComments("proj", "a-1")).rejects.toThrow("Could not load the comments (unexpected response)");

    // non-array body
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json("not-an-array"))));
    await expect(fetchComments("proj", "a-1")).rejects.toThrow("Could not load the comments (unexpected response)");

    // item with truncated: "no"
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([{ ...sampleComment, truncated: "no" }]))));
    await expect(fetchComments("proj", "a-1")).rejects.toThrow("Could not load the comments (unexpected response)");

    // item with text: 7
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([{ ...sampleComment, text: 7 }]))));
    await expect(fetchComments("proj", "a-1")).rejects.toThrow("Could not load the comments (unexpected response)");

    // item with missing author
    const missingAuthor = Object.fromEntries(
      Object.entries(sampleComment).filter(([key]) => key !== "author"),
    );
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([missingAuthor]))));
    await expect(fetchComments("proj", "a-1")).rejects.toThrow("Could not load the comments (unexpected response)");
  });
});

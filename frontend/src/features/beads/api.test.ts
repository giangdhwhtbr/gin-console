import { afterEach, describe, expect, it, vi } from "vitest";
import { BeadNotFoundError, fetchBead, fetchBeads } from "./api";

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
};

const sampleDetail = {
  ...sampleSummary,
  description: "Detailed description",
  dependencies: [{ id: "b-1", title: "Dep", status: "open", type: "blocks" }],
  dependents: [],
  children: [],
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

  // REQ-UI-029: valid closed_at
  it("REQ-UI-029 accepts closed_at as null or string", async () => {
    const withNull = { ...sampleSummary, closed_at: null };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withNull]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withNull]);

    const withString = { ...sampleSummary, closed_at: "2026-10-15T00:00:00Z" };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([withString]))));
    await expect(fetchBeads("proj", false)).resolves.toEqual([withString]);
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
});

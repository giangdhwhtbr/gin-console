import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchReport } from "./api";
import { report } from "./reportFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const filters = { project: "alpha", days: 30 as const, sprint: "" };

afterEach(() => vi.unstubAllGlobals());

describe("fetchReport", () => {
  it("REQ-UI-088 requests the filters without an empty sprint", async () => {
    const mock = vi.fn(() => Promise.resolve(json(report())));
    vi.stubGlobal("fetch", mock);
    await expect(fetchReport(filters)).resolves.toEqual(report());
    expect(mock).toHaveBeenCalledWith("/api/reports?project=alpha&days=30");
    await fetchReport({ ...filters, sprint: "s7" });
    expect(mock).toHaveBeenLastCalledWith("/api/reports?project=alpha&days=30&sprint=s7");
  });
  it("REQ-UI-093 maps failures", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "boom" }, 502))));
    await expect(fetchReport(filters)).rejects.toThrow("boom");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({}, 404))));
    await expect(fetchReport(filters)).rejects.toThrow("Project not found");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ generated_at: "x" }))));
    await expect(fetchReport(filters)).rejects.toThrow("Could not load the report (unexpected response)");
  });
  it("REQ-UI-093 accepts the shape without usage or coverage", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(report()))));
    const loaded = await fetchReport(filters);
    expect(loaded.totals).toEqual({ closed: 4, rework_rate: 0.25 });
    expect(Object.keys(loaded)).not.toContain("usage");
  });
  it("REQ-UI-091 refuses a shape without quality", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ ...report(), quality: undefined }))));
    await expect(fetchReport(filters)).rejects.toThrow("Could not load the report (unexpected response)");
  });
  it("REQ-UI-091 refuses a quality section whose rows are not lists", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ ...report(), quality: { members: [] } }))));
    await expect(fetchReport(filters)).rejects.toThrow("Could not load the report (unexpected response)");
  });
  it("REQ-UI-091 refuses a malformed member row", async () => {
    const quality = { ...report().quality, members: [{ member: "ann", closed: "4", reopens: 1, bugs: 0, rework_rate: 0.25 }] };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ ...report(), quality }))));
    await expect(fetchReport(filters)).rejects.toThrow("Could not load the report (unexpected response)");
  });
  it("REQ-UI-091 refuses a malformed epic row", async () => {
    const quality = { ...report().quality, epics: [{ project: "alpha", id: "a-e1", closed: 2, reopens: 1, bugs: 0, rework_rate: null }] };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ ...report(), quality }))));
    await expect(fetchReport(filters)).rejects.toThrow("Could not load the report (unexpected response)");
  });
});

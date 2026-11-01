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
});

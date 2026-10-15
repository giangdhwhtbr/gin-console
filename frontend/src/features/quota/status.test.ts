import { describe, expect, it } from "vitest";
import { claudeQuota, codexQuota } from "./quotaFixtures";
import { claudeStatus, codexStatus } from "./status";

describe("status", () => {
  // REQ-UI-017
  it("REQ-UI-017 applies the Claude thresholds to the highest percentage", () => {
    expect(claudeStatus(claudeQuota(79, 5))).toEqual({ level: "ok", percent: 79 });
    expect(claudeStatus(claudeQuota(5, 80)).level).toBe("near");
    expect(claudeStatus(claudeQuota(100)).level).toBe("limited");
  });

  // REQ-UI-017
  it("REQ-UI-017 reads Codex from its windows and blocked flag", () => {
    expect(codexStatus(codexQuota()).level).toBe("ok");
    expect(codexStatus(codexQuota({ ordinary_usage_allowed: false })).level).toBe("limited");
    expect(codexStatus(codexQuota({ primary: null })).level).toBe("no-data");
    const both = codexQuota({
      secondary: { used_percent: 85, window_minutes: 10080, resets_at: null },
    });
    expect(codexStatus(both)).toEqual({ level: "near", percent: 85 });
  });

  // REQ-UI-017
  it("REQ-UI-017 reads an error side as error and an empty Claude as no data", () => {
    expect(claudeStatus({ error: "claude timed out" }).level).toBe("error");
    expect(codexStatus({ error: "codex command not found" }).level).toBe("error");
    expect(claudeStatus(claudeQuota()).level).toBe("no-data");
  });
});

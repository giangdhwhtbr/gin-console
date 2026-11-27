import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSession } from "@/app/session";
import { mockupFileHref } from "./paths";

const me = (body: unknown) => vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))));
afterEach(() => vi.unstubAllGlobals());

describe("mockupFileHref", () => {
  it("REQ-AUTH-016 uses the grant path while signed in", async () => {
    me({ enabled: true, user: { name: "An", email: "an@example.com", projects: ["a"], mockup_grant: "g/1 x" } });
    await loadSession();
    expect(mockupFileHref("a", "ui", "2026-11-22", "css/style.css")).toBe(
      "/api/requirements/mockups/a/g/g%2F1%20x/files/ui/2026-11-22/css/style.css",
    );
  });

  it("REQ-AUTH-016 keeps today's path while auth is off", () => {
    expect(mockupFileHref("a", "ui", "2026-11-22", "css/style.css")).toBe("/api/requirements/mockups/a/files/ui/2026-11-22/css/style.css");
  });
});

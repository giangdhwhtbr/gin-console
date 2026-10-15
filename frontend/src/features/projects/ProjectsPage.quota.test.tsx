import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/quota/quotaFixtures";
import { resetQuotaStore } from "@/features/quota/quotaStore";
import { ProjectsPage } from "./ProjectsPage";

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectsPage with the quota strip", () => {
  // REQ-UI-016
  it("REQ-UI-016 still lists the projects when the quota request fails", async () => {
    const project = {
      name: "qwikfone",
      path: "/home/gin/qwikfone",
      scotty_id: null,
      scotty_url: null,
      exists: true,
      workflow: null,
      beads: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(url.includes("/api/quota") ? json({}, 500) : json([project])),
      ),
    );
    render(<ProjectsPage />);
    expect(await screen.findByRole("article", { name: "qwikfone" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(/Quota unavailable/);
  });
});

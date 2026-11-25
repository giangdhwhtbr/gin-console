import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequirementsFailure } from "./api";
import { jsonResponse, listOf, requirement, signoff } from "./fixtures";
import { MatrixSection } from "./MatrixSection";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ok = (...rows: ReturnType<typeof requirement>[]) => ({ status: "ok", data: listOf(...rows) }) as const;
function show(list: Parameters<typeof MatrixSection>[0]["list"], url = "/requirements/matrix?project=a", scenarios: () => Response = () => jsonResponse({ id: "x", title: "t", source: null, scenarios: [] })) {
  window.history.replaceState(null, "", url);
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(scenarios())));
  render(<MatrixSection project="a" list={list} retry={() => undefined} />);
}

describe("MatrixSection", () => {
  it("REQ-REQUIREMENTS-013 row: status with reasons, beads and cases counts", () => {
    show(
      ok(
        requirement({
          status: "untested",
          reasons: ["outdated"],
          beads: [{ id: "b1", title: "x", status: "closed" }, { id: "b2", title: "y", status: "closed" }],
          cases: [{ id: "c1", effective_result: "passed" }, { id: "c2", effective_result: "outdated" }],
        }),
      ),
    );
    const row = screen.getByRole("link", { name: "REQ-UI-001" }).closest("tr");
    if (row === null) throw new Error("no row");
    expect(within(row).getByText("Untested, outdated")).toBeTruthy();
    expect(within(row).getByText("2/2")).toBeTruthy();
    expect(within(row).getByText("1/2")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-013 beads and cases unknown", () => {
    show(ok(requirement({ beads: null, cases: null })));
    expect(screen.getAllByText("unknown")).toHaveLength(2);
  });

  it("REQ-REQUIREMENTS-013 removed rows show with Show removed and do not change the counts", async () => {
    show(ok(requirement({ id: "REQ-UI-001" }), requirement({ id: "REQ-UI-002", state: "removed", status: null })));
    expect(screen.queryByText("REQ-UI-002")).toBeNull();
    const before = screen.getByRole("button", { name: /^Covered/ }).textContent;
    await userEvent.click(screen.getByRole("checkbox", { name: "Show removed" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "REQ-UI-002" })).toBeTruthy());
    expect(screen.getByText("Removed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Covered/ }).textContent).toBe(before);
    expect(before).toBe("Covered 1");
  });

  it("REQ-REQUIREMENTS-014 shared link lists only untested of ui", () => {
    show(
      ok(
        requirement({ id: "REQ-UI-001", status: "untested" }),
        requirement({ id: "REQ-UI-002", status: "covered" }),
        requirement({ id: "REQ-AUTH-001", capability: "auth", status: "untested" }),
      ),
      "/requirements/matrix?project=a&status=untested&capability=ui",
    );
    expect(screen.getByRole("link", { name: "REQ-UI-001" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "REQ-UI-002" })).toBeNull();
    expect(screen.queryByRole("link", { name: "REQ-AUTH-001" })).toBeNull();
  });

  it("REQ-REQUIREMENTS-014 no match offers to clear the filters", async () => {
    show(ok(requirement()), "/requirements/matrix?project=a&q=zzz");
    expect(screen.getByText("No requirements match")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "REQ-UI-001" })).toBeTruthy());
    expect(window.location.search).toBe("?project=a");
  });

  it("REQ-REQUIREMENTS-014 a status button sets the filter in the URL", async () => {
    show(ok(requirement()));
    await userEvent.click(screen.getByRole("button", { name: "Covered 1" }));
    expect(window.location.search).toContain("status=covered");
  });

  it("REQ-REQUIREMENTS-015 shared link opens the panel with the scenarios", async () => {
    show(
      ok(requirement({ id: "REQ-AUTH-001", signoff: signoff({ state: "waived", evidence: "no time" }) })),
      "/requirements/matrix?project=a&req=REQ-AUTH-001",
      () => jsonResponse({ id: "REQ-AUTH-001", title: "t", source: null, scenarios: [{ title: "Login", given: ["a user"], when: ["they sign in"], then: ["they are in"] }] }),
    );
    const panel = screen.getByRole("complementary", { name: "REQ-AUTH-001" });
    expect(await within(panel).findByText("Login")).toBeTruthy();
    expect(within(panel).getByText("Given a user")).toBeTruthy();
    expect(within(panel).getByText("no time")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-015 scenarios fail: says so and lists the beads and cases", async () => {
    show(
      ok(requirement({ id: "REQ-UI-001", beads: [{ id: "b1", title: "Do it", status: "closed" }], cases: [{ id: "TC-1", effective_result: "passed" }] })),
      "/requirements/matrix?project=a&req=REQ-UI-001",
      () => jsonResponse({ error: "boom" }, 502),
    );
    const panel = screen.getByRole("complementary", { name: "REQ-UI-001" });
    expect(await within(panel).findByText("Scenarios could not be loaded")).toBeTruthy();
    expect(within(panel).getByRole("link", { name: /Do it/ }).getAttribute("href")).toBe("/beads/a/b1");
    expect(within(panel).getByText("Done")).toBeTruthy();
    expect(within(panel).getByText(/TC-1/)).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-015 unknown requirement: not found, matrix shown", () => {
    show(ok(requirement()), "/requirements/matrix?project=a&req=REQ-NOPE-001");
    expect(screen.getByText("Requirement REQ-NOPE-001 was not found")).toBeTruthy();
    expect(screen.getByRole("link", { name: "REQ-UI-001" })).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 legacy layout", () => {
    show({ status: "ok", data: { ...listOf(), layout: "legacy" } });
    expect(screen.getByText("This project uses the legacy layout, which has no requirement ids.")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 no requirements yet", () => {
    show(ok());
    expect(screen.getByText("This project has no requirements yet.")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 warning above the table", () => {
    show({ status: "ok", data: { ...listOf(requirement()), warnings: ["beads: bd exited 1"] } });
    const warning = screen.getByRole("status");
    expect(warning.textContent).toContain("beads: bd exited 1");
    expect(warning.compareDocumentPosition(screen.getByRole("table")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 old gin shows the update command", () => {
    show({ status: "error", error: new RequirementsFailure("x", 502, "outdated") });
    expect(screen.getByText("Requirements need a newer gin")).toBeTruthy();
    expect(screen.getByText("gin-workflow/install.sh")).toBeTruthy();
  });
});

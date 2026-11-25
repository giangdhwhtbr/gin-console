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

  it("REQ-REQUIREMENTS-013 counts every status over rows that are not removed", () => {
    show(
      ok(
        requirement({ id: "R1", status: "failing" }),
        requirement({ id: "R2", status: "untested" }),
        requirement({ id: "R3", status: "untested" }),
        requirement({ id: "R4", status: "unknown" }),
        requirement({ id: "R5", status: "building" }),
        requirement({ id: "R6", status: "covered" }),
        requirement({ id: "R7", status: "failing", state: "removed" }),
      ),
    );
    const names = screen.getAllByRole("button", { name: /^(Failing|Untested|Unknown|Building|Covered) \d+$/ }).map((b) => b.textContent);
    expect(names).toEqual(["Failing 1", "Untested 2", "Unknown 1", "Building 1", "Covered 1"]);
  });

  it("REQ-REQUIREMENTS-013 a row with a null status reads Unknown and only a removed state reads Removed", () => {
    show(ok(requirement({ id: "REQ-UI-001", status: null }), requirement({ id: "REQ-UI-002", status: "covered", state: "removed" })), "/requirements/matrix?project=a&removed=1");
    const cell = (id: string) => screen.getByRole("link", { name: id }).closest("tr")?.querySelectorAll("td")[2]?.textContent;
    expect(cell("REQ-UI-001")).toBe("Unknown");
    expect(cell("REQ-UI-002")).toBe("Removed");
  });

  it("REQ-REQUIREMENTS-013 unknown reads per column", () => {
    show(ok(requirement({ id: "REQ-UI-001", beads: null, cases: [] }), requirement({ id: "REQ-UI-002", beads: [], cases: null })));
    const cells = (id: string) => [...(screen.getByRole("link", { name: id }).closest("tr")?.querySelectorAll("td") ?? [])].map((td) => td.textContent);
    expect(cells("REQ-UI-001").slice(4)).toEqual(["unknown", "0/0"]);
    expect(cells("REQ-UI-002").slice(4)).toEqual(["0/0", "unknown"]);
  });

  it("REQ-REQUIREMENTS-014 clear filters resets every filter and keeps project and req", async () => {
    show(ok(requirement()), "/requirements/matrix?project=a&req=REQ-UI-001&status=failing&capability=ui&signoff=current&q=zzz&removed=1");
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(window.location.search).toBe("?project=a&req=REQ-UI-001"));
  });

  it("REQ-REQUIREMENTS-014 each filter control writes the URL", async () => {
    show(ok(requirement({ capability: "ui" }), requirement({ id: "REQ-AUTH-001", capability: "auth" })));
    await userEvent.selectOptions(screen.getByLabelText("Status"), "covered");
    expect(window.location.search).toContain("status=covered");
    await userEvent.selectOptions(screen.getByLabelText("Capability"), "auth");
    expect(window.location.search).toContain("capability=auth");
    await userEvent.selectOptions(screen.getByLabelText("Sign-off"), "none");
    expect(window.location.search).toContain("signoff=none");
    await userEvent.type(screen.getByLabelText("Search"), "a");
    expect(window.location.search).toContain("q=a");
    await userEvent.click(screen.getByRole("checkbox", { name: "Show removed" }));
    expect(window.location.search).toContain("removed=1");
  });

  it("REQ-REQUIREMENTS-015 closing the panel removes req and keeps the rest", async () => {
    show(ok(requirement()), "/requirements/matrix?project=a&req=REQ-UI-001&status=covered");
    await userEvent.click(within(screen.getByRole("complementary", { name: "REQ-UI-001" })).getByRole("button", { name: "Close" }));
    expect(window.location.search).toBe("?project=a&status=covered");
  });

  it("REQ-REQUIREMENTS-015 a removed requirement opens from req", () => {
    show(ok(requirement({ id: "REQ-UI-002", state: "removed", status: null })), "/requirements/matrix?project=a&req=REQ-UI-002");
    expect(screen.getByRole("complementary", { name: "REQ-UI-002" })).toBeTruthy();
    expect(screen.queryByText("was not found", { exact: false })).toBeNull();
  });

  it("REQ-REQUIREMENTS-019 Retry calls the retry of the page", async () => {
    const retry = vi.fn();
    window.history.replaceState(null, "", "/requirements/matrix?project=a");
    render(<MatrixSection project="a" list={{ status: "error", error: new RequirementsFailure("boom", 502) }} retry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

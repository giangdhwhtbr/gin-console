import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Requirement, SignoffState } from "./api";
import { jsonResponse, requirement, signoff } from "./fixtures";
import { RequirementDetails } from "./RequirementDetails";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const scenarios = (id: string) => jsonResponse({ id, title: "t", source: null, scenarios: [{ title: `S of ${id}`, given: [], when: [], then: [] }] });
function open(row: Requirement | undefined, id = row?.id ?? "REQ-X-001", respond: (url: string) => Response | Promise<Response> = () => scenarios(id)) {
  const fetchMock = vi.fn((url: string) => Promise.resolve(respond(url)));
  vi.stubGlobal("fetch", fetchMock);
  const onClose = vi.fn();
  const view = render(<RequirementDetails project="a" id={id} row={row} onClose={onClose} />);
  return { onClose, fetchMock, view };
}
const panel = (id = "REQ-UI-001") => screen.getByRole("complementary", { name: id });

describe("RequirementDetails sign-off", () => {
  const AT = "2026-10-05T09:30:00";
  const states: SignoffState[] = ["current", "changed", "unknown version", "waived"];
  it.each(states)("REQ-REQUIREMENTS-015 %s shows state, person, time, change and evidence", (state) => {
    open(requirement({ signoff: signoff({ state, actor: "ba", at: AT, change: "my-change", evidence: "why" }) }));
    const p = within(panel());
    expect(p.getByText("ba")).toBeTruthy();
    expect(p.getByText("5 Oct, 09:30", { exact: false })).toBeTruthy();
    expect(p.getByText("my-change")).toBeTruthy();
    expect(p.getByText("why")).toBeTruthy();
    expect(p.getByText(state === "waived" ? "Reason" : "Evidence")).toBeTruthy();
  });
  it("REQ-REQUIREMENTS-015 uses the sign-off labels", () => {
    open(requirement({ signoff: signoff({ state: "unknown version", actor: "ba" }) }));
    expect(within(panel()).getByText("Unknown version")).toBeTruthy();
  });
  it("REQ-REQUIREMENTS-015 omits person and time rows when both are null, without inventing a person", () => {
    open(requirement({ signoff: signoff({ state: "waived", evidence: "why" }) }));
    const p = within(panel());
    expect(p.queryByText("Person")).toBeNull();
    expect(p.queryByText("Time")).toBeNull();
    expect(p.queryByText(/Unknown person/)).toBeNull();
  });
  it("REQ-REQUIREMENTS-015 none shows no person or time", () => {
    open(requirement({ signoff: signoff({ state: "none" }) }));
    expect(within(panel()).queryByText("Person")).toBeNull();
    expect(within(panel()).getByText("None", { selector: "dd" })).toBeTruthy();
  });
});

describe("RequirementDetails parts", () => {
  const row = requirement({
    changes: [{ folder: "2026-10-01-add-x", change: "add-x", epic: null, op: "added", archived: null }],
    beads: [
      { id: "b1", title: "Done bead", status: "closed" },
      { id: "b2", title: "Working bead", status: "in_progress" },
    ],
    cases: [{ id: "TC-9", effective_result: "failed" }],
    tests: ["tests/test_x.py"],
  });
  it("REQ-REQUIREMENTS-015 lists changes as links, cases with results and test files", async () => {
    open(row);
    const p = within(panel());
    expect(p.getByRole("link", { name: "add-x" }).getAttribute("href")).toBe("/requirements/changes/2026-10-01-add-x?project=a");
    expect(p.getByText("TC-9").closest("li")?.textContent).toContain("failed");
    expect(p.getByText("tests/test_x.py")).toBeTruthy();
    await screen.findByText("S of REQ-UI-001");
  });
  it("REQ-REQUIREMENTS-015 beads link to their pages and show their state in visible words", async () => {
    open(row);
    const p = within(panel());
    expect(p.getByRole("link", { name: /Done bead/ }).getAttribute("href")).toBe("/beads/a/b1");
    for (const [title, word] of [["Done bead", "Done"], ["Working bead", "In progress"]] as const) {
      const item = p.getByRole("link", { name: new RegExp(title) }).closest("li");
      const label = item === null ? null : within(item).getByText(word);
      expect(label?.className).not.toContain("sr-only");
    }
    await screen.findByText("S of REQ-UI-001");
  });
  it("REQ-REQUIREMENTS-015 an open or unknown status shows itself, never Ready", async () => {
    open(requirement({ beads: [{ id: "b3", title: "Open bead", status: "open" }, { id: "b4", title: "Odd bead", status: "weird_one" }, { id: "b5", title: "Blocked bead", status: "blocked" }] }));
    const p = within(panel());
    const word = (title: string, text: string) => within(p.getByRole("link", { name: new RegExp(title) }).closest("li") ?? document.body).getByText(text);
    expect(word("Open bead", "Open").className).not.toContain("sr-only");
    expect(word("Odd bead", "Weird one")).toBeTruthy();
    expect(word("Blocked bead", "Blocked")).toBeTruthy();
    expect(p.queryByText("Ready")).toBeNull();
    await screen.findByText("S of REQ-UI-001");
  });
  it("REQ-REQUIREMENTS-015 a malformed scenarios body says so and shows the rest", async () => {
    open(row, "REQ-UI-001", () => jsonResponse({ nope: 1 }));
    const p = within(panel());
    expect(await p.findByText("Scenarios could not be loaded")).toBeTruthy();
    expect(p.getByRole("link", { name: /Done bead/ })).toBeTruthy();
    expect(p.getByText("tests/test_x.py")).toBeTruthy();
  });
  it("REQ-REQUIREMENTS-015 unknown beads and cases read unknown", async () => {
    open(requirement({ beads: null, cases: null }));
    expect(within(panel()).getAllByText("unknown")).toHaveLength(2);
    await screen.findByText("S of REQ-UI-001");
  });
  it("REQ-REQUIREMENTS-015 close calls onClose", async () => {
    const { onClose } = open(row);
    await userEvent.click(within(panel()).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
    await screen.findByText("S of REQ-UI-001");
  });
  it("REQ-REQUIREMENTS-015 an answer for an older requirement is dropped when the id changes", async () => {
    let release: (r: Response) => void = () => undefined;
    const slow = new Promise<Response>((resolve) => (release = resolve));
    const fetchMock = vi.fn((url: string) => (url.endsWith("/REQ-UI-001") ? slow : Promise.resolve(scenarios("REQ-UI-002"))));
    vi.stubGlobal("fetch", fetchMock);
    const first = requirement({ id: "REQ-UI-001" });
    const second = requirement({ id: "REQ-UI-002" });
    const view = render(<RequirementDetails project="a" id="REQ-UI-001" row={first} onClose={() => undefined} />);
    view.rerender(<RequirementDetails project="a" id="REQ-UI-002" row={second} onClose={() => undefined} />);
    await screen.findByText("S of REQ-UI-002");
    release(scenarios("REQ-UI-001"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("S of REQ-UI-001")).toBeNull();
  });
  it("REQ-REQUIREMENTS-015 a removed requirement opens by req", async () => {
    open(requirement({ id: "REQ-UI-009", state: "removed", status: null }));
    expect(screen.getByRole("complementary", { name: "REQ-UI-009" })).toBeTruthy();
    await screen.findByText("S of REQ-UI-009");
  });
  it("REQ-REQUIREMENTS-015 focus moves to the heading on open and when the id changes", async () => {
    const view = open(requirement({ id: "REQ-UI-001" })).view;
    await waitFor(() => expect(document.activeElement).toBe(within(panel()).getByRole("heading", { level: 2 })));
    view.rerender(<RequirementDetails project="a" id="REQ-UI-002" row={requirement({ id: "REQ-UI-002" })} onClose={() => undefined} />);
    await waitFor(() => expect(document.activeElement).toBe(within(panel("REQ-UI-002")).getByRole("heading", { level: 2 })));
  });
  it("REQ-REQUIREMENTS-015 focus moves to the heading of the not-found panel", () => {
    open(undefined, "REQ-NOPE-001");
    expect(document.activeElement).toBe(within(panel("REQ-NOPE-001")).getByRole("heading", { level: 2 }));
  });
});

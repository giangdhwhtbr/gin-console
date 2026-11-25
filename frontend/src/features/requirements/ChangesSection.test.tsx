import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ChangeList, ChangeRow } from "./api";
import { RequirementsFailure } from "./api";
import { signoff } from "./fixtures";
import { ChangesSection } from "./ChangesSection";

afterEach(cleanup);

const row = (fields: Partial<ChangeRow> = {}): ChangeRow => ({
  folder: "my-change",
  change: "my-change",
  title: "My change",
  epic: "gin-console-abc",
  archived: null,
  signoff: signoff({ state: "current", actor: "ba", at: "2026-10-05T09:30:00" }),
  added: 3,
  modified: 1,
  removed: 0,
  ...fields,
});
const show = (data: ChangeList) => render(<ChangesSection project="a" list={{ status: "ok", data }} retry={() => undefined} />);
const listOf = (...changes: ChangeRow[]): ChangeList => ({ changes, error: null, cause: null });

describe("ChangesSection", () => {
  it("REQ-REQUIREMENTS-016 signed off: title, epic, person and time, counts", () => {
    show(listOf(row()));
    expect(screen.getByRole("heading", { name: "Open" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "My change" })).toHaveAttribute("href", "/requirements/changes/my-change?project=a");
    expect(screen.getByRole("link", { name: "gin-console-abc" })).toHaveAttribute("href", "/beads/a/gin-console-abc");
    expect(screen.getByText(/ba, 5 Oct, 09:30/)).toBeTruthy();
    expect(screen.getByText("3 added, 1 modified, 0 removed")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-016 open before archived, each in its own list", () => {
    show(listOf(row({ folder: "old", title: "Old one", archived: "2026-09-01" }), row()));
    const open = screen.getByRole("heading", { name: "Open" }).closest("section");
    const archived = screen.getByRole("heading", { name: "Archived" }).closest("section");
    if (open === null || archived === null) throw new Error("no sections");
    expect(within(open).getByText("My change")).toBeTruthy();
    expect(within(archived).getByText("Old one")).toBeTruthy();
    expect(open.compareDocumentPosition(archived) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-016 waived and none sign-offs read in words", () => {
    show(listOf(row({ signoff: signoff({ state: "waived" }) }), row({ folder: "b", title: "B", signoff: signoff({ state: "none" }) })));
    expect(screen.getByText("Sign-off: Waived")).toBeTruthy();
    expect(screen.getByText("Sign-off: None")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-016 trace failed: changes listed, sign-offs Unknown, error shown", () => {
    show({ changes: [row({ signoff: null, added: null, modified: null, removed: null, epic: null })], error: "trace failed", cause: null });
    expect(screen.getByText("trace failed")).toBeTruthy();
    expect(screen.getByRole("link", { name: "My change" })).toBeTruthy();
    expect(screen.getByText("Sign-off: Unknown")).toBeTruthy();
    expect(screen.getByText("Counts unknown")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 empty", () => {
    show(listOf());
    expect(screen.getByText("This project has no changes yet.")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 failure shows the error", () => {
    render(<ChangesSection project="a" list={{ status: "error", error: new RequirementsFailure("boom", 500) }} retry={() => undefined} />);
    expect(screen.getByText("boom")).toBeTruthy();
  });
});

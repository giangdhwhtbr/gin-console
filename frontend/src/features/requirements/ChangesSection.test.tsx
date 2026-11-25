import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
const show = (data: ChangeList, legacy = false) => render(<ChangesSection project="a" legacy={legacy} list={{ status: "ok", data }} retry={() => undefined} />);
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

  it("REQ-REQUIREMENTS-019 failure shows the error and Retry works", async () => {
    const retry = vi.fn();
    render(<ChangesSection project="a" legacy={false} list={{ status: "error", error: new RequirementsFailure("boom", 500) }} retry={retry} />);
    expect(screen.getByText("boom")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("REQ-REQUIREMENTS-019 outdated cause shows the update command and keeps the changes listed", () => {
    show({ changes: [row()], error: "gin too old", cause: "outdated" });
    expect(screen.getByText("Requirements need a newer gin")).toBeTruthy();
    expect(screen.getByText("gin-workflow/install.sh")).toBeTruthy();
    expect(screen.getByRole("link", { name: "My change" })).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 schema cause shows its text and keeps the changes listed", () => {
    show({ changes: [row()], error: "unsupported schema 2", cause: "schema" });
    expect(screen.getByText("unsupported schema 2")).toBeTruthy();
    expect(screen.getByText(/This console reads schema 1/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "My change" })).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 legacy and empty says the layout has no requirement ids", () => {
    show(listOf(), true);
    expect(screen.getByText("This project uses the legacy layout, which has no requirement ids.")).toBeTruthy();
    expect(screen.queryByText("This project has no changes yet.")).toBeNull();
  });

  it("REQ-REQUIREMENTS-016 legacy with changes still lists them", () => {
    show(listOf(row()), true);
    expect(screen.getByRole("link", { name: "My change" })).toBeTruthy();
    expect(screen.queryByText(/legacy layout/)).toBeNull();
  });

  it("REQ-REQUIREMENTS-019 empty list with a trace error keeps both the error and the empty text", () => {
    show({ changes: [], error: "trace failed", cause: null });
    expect(screen.getByText("trace failed")).toBeTruthy();
    expect(screen.getByText("This project has no changes yet.")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-016 a change without an epic shows no epic link", () => {
    show(listOf(row({ epic: null })));
    expect(screen.queryByText(/Epic:/)).toBeNull();
  });
});

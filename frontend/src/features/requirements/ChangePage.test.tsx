import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChangeRow } from "./api";
import { jsonResponse, signoff } from "./fixtures";
import { ChangePage } from "./ChangePage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const content = (files: Record<string, string>, fields: object = {}) => ({
  folder: "my-change",
  change: "my-change",
  title: "My change",
  epic: "gin-console-abc",
  archived: null,
  files,
  ...fields,
});
const row: ChangeRow = {
  folder: "my-change",
  change: "my-change",
  title: "My change",
  epic: "gin-console-abc",
  archived: null,
  signoff: signoff({ state: "current", actor: "ba", at: "2026-10-05T09:30:00" }),
  added: 1,
  modified: 0,
  removed: 0,
};
function show(response: Response, url = "/requirements/changes/my-change?project=a", signed: ChangeRow | null = row) {
  window.history.replaceState(null, "", url);
  const fetchMock = vi.fn<(url: string) => Promise<Response>>(() => Promise.resolve(response.clone()));
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, view: render(<ChangePage project="a" folder="my-change" row={signed} />) };
}

describe("ChangePage", () => {
  it("REQ-REQUIREMENTS-017 header and tabs in order, first shown", async () => {
    show(jsonResponse(content({ tests: "T", proposal: "The proposal text", plan: "P" })));
    await screen.findByText("The proposal text");
    expect(screen.getByRole("heading", { name: "My change" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "gin-console-abc" })).toHaveAttribute("href", "/beads/a/gin-console-abc");
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText(/ba, 5 Oct, 09:30/)).toBeTruthy();
    const tabs = screen.getAllByRole("link", { name: /^(Proposal|Spec delta|Design|Plan|Tests)$/ });
    expect(tabs.map((t) => t.textContent)).toEqual(["Proposal", "Plan", "Tests"]);
    expect(tabs[0]).toHaveAttribute("aria-current", "page");
    expect(tabs[1]).toHaveAttribute("href", "/requirements/changes/my-change?project=a&tab=plan");
  });

  it("REQ-REQUIREMENTS-017 archived date and missing sign-off row read Unknown", async () => {
    show(jsonResponse(content({ proposal: "x" }, { archived: "2026-09-01" })), "/requirements/changes/my-change?project=a", null);
    await screen.findByText("x");
    expect(screen.getByText("1 Sep", { exact: false })).toBeTruthy();
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-017 the tab in the URL is shown, an unknown one falls back to the first", async () => {
    show(jsonResponse(content({ proposal: "PROPOSAL", plan: "PLAN" })), "/requirements/changes/my-change?project=a&tab=plan");
    await screen.findByText("PLAN");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    cleanup();
    show(jsonResponse(content({ proposal: "PROPOSAL", plan: "PLAN" })), "/requirements/changes/my-change?project=a&tab=zzz");
    await screen.findByText("PROPOSAL");
  });

  it("REQ-REQUIREMENTS-017 missing plan has no Plan tab", async () => {
    show(jsonResponse(content({ proposal: "x", design: "d" })));
    await screen.findByText("x");
    expect(screen.queryByRole("link", { name: "Plan" })).toBeNull();
    expect(screen.getByRole("link", { name: "Design" })).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-017 a script in Markdown renders as text and does not run", async () => {
    show(jsonResponse(content({ proposal: "<script>alert(1)</script>" })));
    await waitFor(() => expect(screen.getByRole("heading", { name: "My change" })).toBeTruthy());
    expect(await screen.findByText("<script>alert(1)</script>")).toBeTruthy();
    expect(document.querySelector("main script, script")).toBeNull();
  });

  it("REQ-REQUIREMENTS-017 unknown change says so and links to the Changes section", async () => {
    show(jsonResponse({ error: "no such change" }, 404));
    await screen.findByText("Change my-change was not found");
    expect(screen.getByRole("link", { name: "Changes" })).toHaveAttribute("href", "/requirements/changes?project=a");
  });

  it("REQ-REQUIREMENTS-019 another failure shows the error and Retry fetches again", async () => {
    const { fetchMock } = show(jsonResponse({ error: "boom" }, 500));
    await screen.findByText("boom");
    fetchMock.mockImplementationOnce(() => new Promise<Response>(() => undefined));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Loading change")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("REQ-REQUIREMENTS-017 no documents says so and shows no tabs", async () => {
    show(jsonResponse(content({})));
    await screen.findByText("This change has no documents yet.");
    expect(screen.queryByRole("navigation", { name: "Change documents" })).toBeNull();
  });

  it("REQ-REQUIREMENTS-017 a null epic reads None, not a link", async () => {
    show(jsonResponse(content({ proposal: "x" }, { epic: null })));
    await screen.findByText("x");
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /gin-console/ })).toBeNull();
  });

  it("REQ-REQUIREMENTS-017 another folder is fetched again and shows loading", async () => {
    const { fetchMock, view } = show(jsonResponse(content({ proposal: "first" })));
    await screen.findByText("first");
    view.rerender(<ChangePage project="a" folder="other" row={null} />);
    expect(screen.getByText("Loading change")).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/requirements/changes/a/other");
  });

  it("REQ-REQUIREMENTS-017 a row of another folder is ignored, the sign-off reads Unknown", async () => {
    show(jsonResponse(content({ proposal: "x" })), "/requirements/changes/my-change?project=a", { ...row, folder: "else" });
    await screen.findByText("x");
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.queryByText(/ba, 5 Oct/)).toBeNull();
  });
});

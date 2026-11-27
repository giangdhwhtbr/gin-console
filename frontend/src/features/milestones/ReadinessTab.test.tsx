import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetConfiguredProjects, rememberProject, setFavorite } from "@/app/project";
import type { ItemState, Readiness, ReadinessItem } from "@/features/qa/api";
import { jsonResponse } from "@/features/qa/fixtures";
import { ReadinessTab } from "./ReadinessTab";

const item = (key: ReadinessItem["key"], title: string, state: ItemState, fields: Partial<ReadinessItem> = {}): ReadinessItem => ({
  key, title, state, note: null, error: null, requirements: [], cases: [], bugs: [], epics: [], ...fields,
});
const readiness = (verdict: Readiness["verdict"], items: ReadinessItem[]): Readiness => ({
  milestone: { id: "m2", title: "Second" },
  epics: [{ id: "e2", title: "Epic two", status: "open" }],
  generated_at: "2026-11-27T10:00:00Z",
  verdict,
  items,
});
const NOT_READY = readiness("not_ready", [
  item("cases", "Every requirement has a case", "fail", { requirements: [{ id: "REQ-UI-002", title: "Second req", capability: "ui" }] }),
  item("results", "Every case passed since its requirement changed", "fail", { cases: [{ id: "TC-UI-002", title: "Outdated case", effective_result: "outdated", bug: "b-7" }] }),
  item("bugs", "No open P0 or P1 bug", "fail", {
    bugs: [
      { id: "b-1", title: "From e1", priority: 1, epic: { id: "e1", title: "Epic one" } },
      { id: "b-2", title: "Lost", priority: 0, epic: null },
    ],
  }),
  item("gates", "Every epic shipped", "fail", { epics: [{ id: "e2", title: "Epic two", gate: "implementation_complete" }] }),
]);

let answer: () => Response;
beforeEach(() => {
  forgetConfiguredProjects();
  setFavorite(null);
  rememberProject("alpha");
  answer = () => jsonResponse(NOT_READY);
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(url === "/api/qa/readiness/alpha/m2" ? answer() : jsonResponse({}, 404))));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const show = () => render(<ReadinessTab project="alpha" milestoneId="m2" />);
const section = async (title: string) => within((await screen.findByRole("heading", { name: title })).closest("section") ?? document.body);

describe("ReadinessTab", () => {
  it("REQ-QA-012 says it is loading, then reads Not ready with a fail mark word and a count on each item", async () => {
    show();
    expect(screen.getByText("Loading readiness…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Not ready" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Not ready", "Every requirement has a case", "Every case passed since its requirement changed", "No open P0 or P1 bug", "Every epic shipped"]);
    const bugs = await section("No open P0 or P1 bug");
    expect(bugs.getByText("Fail")).toBeInTheDocument();
    expect(bugs.getByText("2")).toBeInTheDocument();
  });

  it("REQ-QA-012 the gates list shows e2 waiting on its gate with a link to its bead page", async () => {
    show();
    const gates = await section("Every epic shipped");
    const toggle = gates.getByRole("button", { name: "Show list" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(gates.getByRole("link", { name: "e2" })).toHaveAttribute("href", "/beads/alpha/e2");
    expect(gates.getByText("waiting on implementation_complete")).toBeInTheDocument();
  });

  it("REQ-QA-012 lists link requirements to the matrix, cases to their page, bugs to their bead with P<n> and the source", async () => {
    show();
    const open = async (title: string) => {
      const part = await section(title);
      await userEvent.click(part.getByRole("button", { name: "Show list" }));
      return part;
    };
    const cases = await open("Every requirement has a case");
    expect(cases.getByRole("link", { name: "REQ-UI-002" })).toHaveAttribute("href", "/requirements/matrix?project=alpha&req=REQ-UI-002");
    const results = await open("Every case passed since its requirement changed");
    expect(results.getByRole("link", { name: "TC-UI-002" })).toHaveAttribute("href", "/tests/alpha/TC-UI-002");
    expect(results.getByText("outdated")).toBeInTheDocument();
    expect(results.getByRole("link", { name: "b-7" })).toHaveAttribute("href", "/beads/alpha/b-7");
    const bugs = await open("No open P0 or P1 bug");
    expect(bugs.getByRole("link", { name: "b-1" })).toHaveAttribute("href", "/beads/alpha/b-1");
    expect(bugs.getByText("P1")).toBeInTheDocument();
    expect(bugs.getByRole("link", { name: "e1" })).toHaveAttribute("href", "/beads/alpha/e1");
    expect(bugs.getByText("P0")).toBeInTheDocument();
    expect(bugs.getByText("Unknown source")).toBeInTheDocument();
  });

  it("REQ-QA-012 reads Ready with a pass word and the note", async () => {
    answer = () => jsonResponse(readiness("ready", [item("cases", "Every requirement has a case", "pass", { note: "No requirement changed" })]));
    show();
    expect(await screen.findByRole("heading", { name: "Ready" })).toBeInTheDocument();
    const part = await section("Every requirement has a case");
    expect(part.getByText("Pass")).toBeInTheDocument();
    expect(part.getByText("No requirement changed")).toBeInTheDocument();
  });

  it("REQ-QA-012 reads Unknown with the word Unknown and the error of the source", async () => {
    answer = () => jsonResponse(readiness("unknown", [item("bugs", "No open P0 or P1 bug", "unknown", { error: "export snapshot failed" })]));
    show();
    expect(await screen.findByRole("heading", { name: "Unknown" })).toBeInTheDocument();
    const part = await section("No open P0 or P1 bug");
    expect(part.getByText("Unknown")).toBeInTheDocument();
    expect(part.getByText("export snapshot failed")).toBeInTheDocument();
  });

  it("REQ-QA-012 a failed request shows the error and Try again loads it again", async () => {
    answer = () => jsonResponse({ error: "gin milestone show failed" }, 502);
    show();
    expect(await screen.findByText("gin milestone show failed")).toBeInTheDocument();
    answer = () => jsonResponse(NOT_READY);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Not ready" })).toBeInTheDocument());
  });
});

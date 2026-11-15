import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Comment } from "@/features/beads/api";
import { RetroTab } from "./RetroTab";
import type { useMilestoneComments } from "./useMilestoneComments";

afterEach(cleanup);

type Comments = ReturnType<typeof useMilestoneComments>;
const note = (id: string, author: string, created_at: string, text: string): Comment => ({ id, author, created_at, text, truncated: false });
const ok = (comments: Comment[]): Comments => ({ state: "ok", comments, error: null, retry: vi.fn() });

describe("RetroTab", () => {
  it("REQ-MILESTONE-UI-019 shows the close block and the retro of each member", async () => {
    render(
      <RetroTab
        milestoneId="m1"
        comments={ok([
          note("1", "lead", "2026-11-10T10:00:00Z", "[gin close] m1\nDelivered: the **parser**\nAction: write docs"),
          note("2", "ann", "2026-11-11T10:00:00Z", "[gin retro] m1 ann\nWent well: pairing"),
          note("3", "bao", "2026-11-11T11:00:00Z", "[gin retro] m1 bao\nSlowed us: CI"),
        ])}
      />,
    );
    expect(screen.getByText("lead")).toBeInTheDocument();
    expect(screen.getByText(new Date("2026-11-10T10:00:00Z").toLocaleString())).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delivered" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Action" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Spillover" })).toBeNull();
    expect(await screen.findByText("parser")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.querySelector("h3")?.textContent)).toEqual(["ann", "bao"]);
    expect(screen.getByRole("heading", { name: "Went well" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Slowed us" })).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-019 a comment with no labels shows in full with a note", () => {
    render(<RetroTab milestoneId="m1" comments={ok([note("1", "chi", "2026-11-11T10:00:00Z", "[gin retro] m1 chi\nfree words")])} />);
    expect(screen.getByText("Not in the expected format")).toBeInTheDocument();
    expect(screen.getByText(/free words/)).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-019 says how to record a retro when there is none", () => {
    render(<RetroTab milestoneId="m1" comments={ok([note("1", "x", "2026-11-11T10:00:00Z", "[gin retro] m2 ann\nWent well: x")])} />);
    expect(screen.getByText(/No retros yet\. Members record one with/)).toHaveTextContent("/retro");
  });

  it("REQ-MILESTONE-UI-019 shows loading", () => {
    render(<RetroTab milestoneId="m1" comments={{ state: "loading", comments: [], error: null, retry: vi.fn() }} />);
    expect(screen.getByText("Loading retros…")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-019 shows the error with a Retry", async () => {
    const retry = vi.fn();
    render(<RetroTab milestoneId="m1" comments={{ state: "error", comments: [], error: "Bead not found", retry }} />);
    expect(screen.getByText("Bead not found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

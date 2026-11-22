import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Legend } from "./Legend";
import { DEFINITIONS } from "@/lib/definitions";

afterEach(cleanup);

describe("Legend", () => {
  it("REQ-UI-133 Open and close: lists the five state marks and the blocked rule; Escape closes it and focus is back on Legend", async () => {
    const user = userEvent.setup();
    render(<Legend />);
    const trigger = screen.getByRole("button", { name: "Legend" });
    await user.click(trigger);
    const panel = await screen.findByRole("dialog");
    for (const word of ["Ready", "In progress", "Blocked", "Done", "Deferred"]) {
      expect(within(panel).getByText(word)).toBeInTheDocument();
    }
    // REQ-UI-064 five distinct glyphs
    expect(new Set(Array.from(panel.querySelectorAll("svg[data-glyph]"), (g) => g.getAttribute("data-glyph"))).size).toBe(5);
    expect(within(panel).getByText(DEFINITIONS.blocked)).toBeInTheDocument();
    expect(within(panel).getByText(DEFINITIONS.done)).toBeInTheDocument();
    expect(within(panel).getByText(DEFINITIONS.progress)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("REQ-UI-133 the panel fits a 360px window", async () => {
    const user = userEvent.setup();
    render(<Legend />);
    await user.click(screen.getByRole("button", { name: "Legend" }));
    expect(await screen.findByRole("dialog")).toHaveClass("max-w-[calc(100vw-2rem)]");
  });

  it("REQ-UI-133 lists size, Prep, lane and both count kinds with their sentences", async () => {
    const user = userEvent.setup();
    render(<Legend />);
    await user.click(screen.getByRole("button", { name: "Legend" }));
    const panel = await screen.findByRole("dialog");
    for (const key of ["size", "prep", "lane", "comments", "dependencies"] as const) {
      expect(within(panel).getByText(DEFINITIONS[key])).toBeInTheDocument();
    }
  });

  it("REQ-UI-133 a click outside the panel closes it", async () => {
    const user = userEvent.setup();
    render(
      <>
        <p>page text</p>
        <Legend />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Legend" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByText("page text"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("REQ-UI-133 activating the control again closes the panel", async () => {
    const user = userEvent.setup();
    render(<Legend />);
    const trigger = screen.getByRole("button", { name: "Legend" });
    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

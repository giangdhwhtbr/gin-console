import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DEFINITIONS, countHint } from "@/lib/definitions";
import { formatDateTime } from "@/lib/dates";
import type { Beads, Project } from "./api";
import { ProjectCard } from "./ProjectCard";

afterEach(cleanup);

const beads: Beads = { open: 3, in_progress: 1, blocked: 4, ready: 2, prep: 1, epics: [] };
const project = (extra: Partial<Project> = {}): Project => ({
  name: "example",
  path: "/home/gin/example",
  exists: true,
  workflow: null,
  beads,
  ...extra,
});

describe("ProjectCard hints", () => {
  it("REQ-UI-132 Blocked count: focus shows the blocked rule and Escape closes it", async () => {
    const user = userEvent.setup();
    render(<ProjectCard project={project()} />);
    const blocked = within(screen.getByRole("article", { name: "example" })).getByText("blocked 4");
    expect(blocked).toHaveAttribute("tabindex", "0");
    expect(blocked).not.toHaveAttribute("title");
    blocked.focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(DEFINITIONS.blocked);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("REQ-UI-132 every count is focusable and ties its rule with the scope", () => {
    render(<ProjectCard project={project()} />);
    for (const [text, rule] of [
      ["open 3", "open"],
      ["in progress 1", "inProgress"],
      ["ready 2", "ready"],
      ["prep 1", "prep"],
    ] as const) {
      const count = screen.getByText(text);
      expect(count).toHaveAttribute("tabindex", "0");
      const id = count.getAttribute("aria-describedby") ?? "";
      expect(document.getElementById(id)?.textContent).toContain(DEFINITIONS[rule]);
    }
    expect(countHint("ready", "this project")).toBe(`${DEFINITIONS.ready} Counted in this project.`);
  });

  it("REQ-UI-132 the pull line shows the full date and time as a tooltip, not a title", () => {
    const at = new Date(Date.now() - 120_000).toISOString();
    render(<ProjectCard project={project({ pull: { at, status: "ok", error: null } })} />);
    const line = screen.getByText("pulled 2 minutes ago");
    expect(line).not.toHaveAttribute("title");
    const id = line.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(id)).toHaveTextContent(formatDateTime(at));
  });
});

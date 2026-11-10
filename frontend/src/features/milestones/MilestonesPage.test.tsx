import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead, json } from "@/features/beads/beadFixtures";
import { entry, forecast, list, stubMilestones } from "./milestoneFixtures";
import { MilestonesPage } from "./MilestonesPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function open(body: Response, beads: Parameters<typeof stubMilestones>[1] = []) {
  window.history.replaceState(null, "", "/milestones?project=alpha");
  stubMilestones(() => body, beads);
  render(<MilestonesPage />);
}
const rowOf = async (title: string) => (await screen.findByRole("link", { name: title })).closest("li") ?? document.body;

describe("MilestonesPage", () => {
  it("REQ-MILESTONE-UI-001 lists milestones with status, period, progress and warnings", async () => {
    open(
      json(
        list([
          entry("m-2", { title: "Hardening", status: "planned", start: "2026-12-01", end: "2026-12-18", warnings: 0 }),
          entry("m-1", { title: "Beta", status: "active", kickoff: "2026-11-02", epics: { total: 6, closed: 2 }, warnings: 2 }),
        ]),
      ),
    );
    const beta = await rowOf("Beta");
    expect(within(beta).getByText("Active")).toBeInTheDocument();
    expect(beta).toHaveTextContent("Kicks off 2 Nov");
    expect(beta).toHaveTextContent("2 Nov – 18 Dec");
    expect(beta).toHaveTextContent("2 of 6");
    expect(beta).toHaveTextContent("2 warnings");
    const hardening = await rowOf("Hardening");
    expect(within(hardening).getByText("Planned")).toBeInTheDocument();
    expect(hardening).toHaveTextContent("None");
    const titles = screen.getAllByRole("link").map((a) => a.textContent);
    expect(titles.indexOf("Beta")).toBeLessThan(titles.indexOf("Hardening"));
    expect(screen.getByRole("link", { name: "Beta" })).toHaveAttribute("href", "/milestones/alpha/m-1");
  });

  it("REQ-MILESTONE-UI-001 does not show the unassigned_epics count", async () => {
    open(json(list([entry("m-1", { title: "Beta" })], { unassigned_epics: 4 })));
    await rowOf("Beta");
    expect(screen.queryByText(/roadmap epics? (isn't|aren't) in a milestone/)).toBeNull();
  });

  const epic = (id: string, overrides: Parameters<typeof bead>[1] = {}) => bead(id, { issue_type: "epic", title: `Epic ${id}`, ...overrides });

  it("REQ-MILESTONE-UI-010 lists the epics without a parent, with links and a matching count", async () => {
    open(json(list([entry("m-1")])), [
      epic("e-a", { labels: ["roadmap"] }),
      epic("e-b"),
      epic("e-c", { parent: "m-1" }),
      epic("e-d", { parent: "e-a" }),
      bead("t-1", { title: "Task t-1" }),
    ]);
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (2)" })).toBeInTheDocument();
    const section = within(screen.getByRole("list", { name: "Epics not in a milestone" }));
    expect(section.getAllByRole("listitem")).toHaveLength(2);
    expect(section.getByRole("link", { name: "Epic e-a" })).toHaveAttribute("href", "/beads/alpha/e-a");
    expect(section.getByRole("link", { name: "Epic e-b" })).toHaveAttribute("href", "/beads/alpha/e-b");
    expect(section.getByText("roadmap")).toBeInTheDocument();
    expect(screen.getByText("Add them with /roadmap --milestone <id>.")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-010 Show closed fetches closed beads and lists closed epics dimmed", async () => {
    const fetchMock = stubMilestones(() => json(list([entry("m-1")])), [epic("e-a"), epic("e-e", { status: "closed" })]);
    window.history.replaceState(null, "", "/milestones?project=alpha");
    render(<MilestonesPage />);
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (1)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (2)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Epic e-e" }).closest("li")).toHaveClass("text-muted-foreground");
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => typeof input === "string" && input.includes("/api/beads?project=alpha&closed=1"))).toBe(true),
    );
  });

  it("REQ-MILESTONE-UI-010 says every epic is in a milestone when none is left", async () => {
    open(json(list([entry("m-1")])), [epic("e-c", { parent: "m-1" })]);
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (0)" })).toBeInTheDocument();
    expect(screen.getByText("Every epic is in a milestone.")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-010 a beads failure stays in the section and Retry refetches", async () => {
    let fail = true;
    open(json(list([entry("m-1", { title: "Beta" })])), () => (fail ? json({ error: "bd failed" }, 502) : json([epic("e-a")])));
    expect(await screen.findByText("Epics couldn't be loaded")).toBeInTheDocument();
    expect(await rowOf("Beta")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (1)" })).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-001 shows a list entry's error in place of progress and warnings", async () => {
    open(
      json(
        list([
          entry("m-1", { title: "Beta" }),
          entry("m-2", { title: "Hardening", error: "dependency cycle: A -> B -> A", warnings: null, finish: null }),
        ]),
      ),
    );
    const hardening = await rowOf("Hardening");
    expect(hardening).toHaveTextContent("dependency cycle: A -> B -> A");
    expect(within(hardening).queryByRole("progressbar")).toBeNull();
    expect(within(await rowOf("Beta")).getByRole("progressbar")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-001 an empty project says how to create a milestone", async () => {
    open(json(list([])));
    expect(await screen.findByText(/No milestones in alpha yet/)).toBeInTheDocument();
    expect(screen.getByText(/gin milestone create/)).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 old gin-workflow: says to run the installer", async () => {
    open(json({ error: "this gin has no milestone command", cause: "outdated" }, 502));
    expect(await screen.findByText("Milestones need a newer gin")).toBeInTheDocument();
    expect(screen.getByText("gin-workflow/install.sh")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 markdown tracking: says milestones need Beads", async () => {
    open(json({ error: "milestones need providers.task_tracking: beads", cause: "tracking" }, 502));
    expect(await screen.findByText("This project tracks tasks in markdown")).toBeInTheDocument();
    expect(screen.getByText(/providers\.task_tracking: beads/)).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 unknown schema: names it and lists nothing", async () => {
    open(json({ error: "gin reports milestone schema 2", cause: "schema" }, 502));
    expect(await screen.findByText("gin reports milestone schema 2")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Milestones" })).toBeNull();
  });

  it("REQ-MILESTONE-UI-016 shows the forecast card above the list", async () => {
    open(json(list([entry("m-1", { title: "Beta" })], { forecast: forecast(), today: "2026-11-08" })));
    const card = await screen.findByRole("region", { name: "Project forecast" });
    const listEl = screen.getByRole("list", { name: "Milestones" });
    expect(card.compareDocumentPosition(listEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("REQ-MILESTONE-UI-016 no card without a forecast", async () => {
    open(json(list([entry("m-1", { title: "Beta" })])));
    await rowOf("Beta");
    expect(screen.queryByRole("region", { name: "Project forecast" })).toBeNull();
  });

  it("REQ-MILESTONE-UI-001 lanes and finish", async () => {
    open(
      json(
        list(
          [
            entry("m-1", { title: "Beta", lanes: 2, start: "2026-11-02", end: "2026-11-12", finish: "2026-11-23" }),
            entry("m-2", { title: "Hardening", lanes: 1, start: "2026-11-16", end: "2026-12-04", finish: "2026-12-01" }),
          ],
          { today: "2026-11-08" },
        ),
      ),
    );
    const beta = await rowOf("Beta");
    expect(beta).toHaveTextContent("2 lanes");
    expect(within(beta).getByText("Finishes 23 Nov")).toHaveClass("text-state-blocked");
    const hardening = await rowOf("Hardening");
    expect(hardening).toHaveTextContent("1 lane");
    expect(within(hardening).getByText("Finishes 1 Dec")).not.toHaveClass("text-state-blocked");
  });

  it("REQ-MILESTONE-UI-001 older gin-workflow: a dash for lanes", async () => {
    open(json(list([entry("m-1", { title: "Beta", lanes: null })])));
    expect(within(await rowOf("Beta")).getByText("–")).toBeInTheDocument();
  });
});

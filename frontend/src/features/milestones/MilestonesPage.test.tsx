import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/beads/beadFixtures";
import { entry, list, stubMilestones } from "./milestoneFixtures";
import { MilestonesPage } from "./MilestonesPage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function open(body: Response) {
  window.history.replaceState(null, "", "/milestones?project=alpha");
  stubMilestones(() => body);
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

  it("REQ-MILESTONE-UI-001 shows the epics not yet in a milestone", async () => {
    open(json(list([entry("m-1")], { unassigned_epics: 4 })));
    expect(await screen.findByText(/4 roadmap epics aren't in a milestone yet/)).toBeInTheDocument();
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
    expect(screen.getByText(/gin-workflow milestone create/)).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 old gin-workflow: says to run the installer", async () => {
    open(json({ error: "this gin-workflow has no milestone command", cause: "outdated" }, 502));
    expect(await screen.findByText("Milestones need a newer gin-workflow")).toBeInTheDocument();
    expect(screen.getByText("gin-workflow/install.sh")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 markdown tracking: says milestones need Beads", async () => {
    open(json({ error: "milestones need providers.task_tracking: beads", cause: "tracking" }, 502));
    expect(await screen.findByText("This project tracks tasks in markdown")).toBeInTheDocument();
    expect(screen.getByText(/providers\.task_tracking: beads/)).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-005 unknown schema: names it and lists nothing", async () => {
    open(json({ error: "gin-workflow reports milestone schema 2", cause: "schema" }, 502));
    expect(await screen.findByText("gin-workflow reports milestone schema 2")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Milestones" })).toBeNull();
  });
});

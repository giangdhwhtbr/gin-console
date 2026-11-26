import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { formatDate } from "@/lib/dates";
import { BugsSection } from "./BugsSection";
import type { BugsReport, OpenBug } from "./bugsApi";
import { bugsReport } from "./bugsFixtures";

afterEach(cleanup);

const show = (report: BugsReport) =>
  render(
    <HintProvider>
      <BugsSection project={report.project} report={report} />
    </HintProvider>,
  );
const value = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;
const bug = (n: number): OpenBug => ({ id: `a-${n}`, title: `Bug ${n}`, priority: 1, assignee: "ann", age_days: n, epic: null });
const section = (name: string) => screen.getByRole("region", { name });

describe("BugsSection", () => {
  it("REQ-REPORTS-043 figures read 13, 11, 25, 43 d and 0.5 d, and Opened names Bugs found later", () => {
    const base = bugsReport();
    show(bugsReport({ figures: { ...base.figures, opened: 13, closed: 11, open_now: 25, oldest_open_days: 43, median_close_days: 0.5 } }));
    expect(["Opened", "Closed", "Open now", "Oldest open", "Median days to close"].map((l) => value(l)?.textContent)).toEqual(["13", "11", "25", "43 d", "0.5 d"]);
    expect(value("Opened")).toHaveAttribute("data-hint", DEFINITIONS.bugsOpened);
    expect(value("Opened")?.getAttribute("data-hint")).toContain("Bugs found later");
    expect(value("Closed")?.getAttribute("data-hint")).toContain("Bugs found later");
    expect(value("Open now")?.getAttribute("data-hint")).toContain("whatever the scope");
  });

  it("REQ-REPORTS-043 a null figure reads a dash", () => {
    const base = bugsReport();
    show(bugsReport({ figures: { ...base.figures, oldest_open_days: null, median_close_days: null } }));
    expect(value("Oldest open")?.textContent).toBe("—");
    expect(value("Median days to close")?.textContent).toBe("—");
  });

  it("REQ-REPORTS-043 weeks: two bars labelled with their Monday, counts as text, and a legend", () => {
    const r = bugsReport();
    show(r);
    const bars = within(section("Bugs per week")).getAllByRole("listitem").filter((li) => li.hasAttribute("aria-label"));
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveTextContent("5 opened, 3 closed");
    expect(bars[1]).toHaveTextContent("0 opened, 0 closed");
    expect(bars[0]).toHaveAttribute("aria-label", `${formatDate("2026-11-16", r.today)}: Week of ${formatDate("2026-11-16", r.today)}: 5 opened, 3 closed`);
    const legend = within(section("Bugs per week")).getAllByRole("listitem").filter((li) => !li.hasAttribute("aria-label"));
    expect(legend.map((li) => li.textContent)).toEqual(["Opened", "Closed"]);
  });

  it("REQ-REPORTS-043 epic rows end with Source unknown, the share note says 62%, and the title links to its bead", () => {
    const r = bugsReport();
    show(r);
    const epics = section("Bugs by epic");
    expect(within(epics).getByText("62% of the bugs opened in this scope have no source epic")).toBeInTheDocument();
    const rows = within(epics).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Checkout541");
    expect(rows[rows.length - 1]).toHaveTextContent("Source unknown872");
    expect(within(epics).getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/beads/alpha/e-2");
  });

  it("REQ-REPORTS-043 the share note is hidden when no bug of unknown source was opened", () => {
    show(bugsReport({ epics: [{ id: "e-2", title: "Checkout", opened: 13, closed: 11, open_now: 1 }] }));
    expect(screen.queryByText(/have no source epic/)).toBeNull();
  });

  it("REQ-REPORTS-043 open bugs: note, columns, P<priority>, Unassigned, id under the title, Source unknown", () => {
    show(bugsReport());
    const open = section("Open bugs");
    expect(within(open).getByText("All open bugs of alpha, whatever the scope")).toBeInTheDocument();
    expect(within(open).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Bug", "Priority", "Assignee", "Age", "Epic"]);
    const rows = within(open).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Crash on savea-1P0ann43 dCheckout");
    expect(within(open).getByRole("link", { name: "Crash on save" })).toHaveAttribute("href", "/beads/alpha/a-1");
    expect(rows[2]).toHaveTextContent("Wrong totala-2—Unassigned5 dSource unknown");
  });

  it("REQ-REPORTS-043 Show all: 20 rows, then 25, and the control is gone", () => {
    show(bugsReport({ open: Array.from({ length: 25 }, (_, i) => bug(i)) }));
    const rows = () => within(section("Open bugs")).getAllByRole("row").length - 1;
    expect(rows()).toBe(20);
    fireEvent.click(screen.getByRole("button", { name: "Show all 25" }));
    expect(rows()).toBe(25);
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("REQ-REPORTS-043 no Show all control up to 20 open bugs", () => {
    show(bugsReport({ open: Array.from({ length: 20 }, (_, i) => bug(i)) }));
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("REQ-REPORTS-043 phone: a table sits in a frame that scrolls, not the page", () => {
    show(bugsReport({ open: [{ ...bug(1), title: "A very long title ".repeat(20) }] }));
    const table = within(section("Open bugs")).getByRole("table");
    expect(table.parentElement?.className).toMatch(/overflow-x-auto/);
  });

  it("REQ-REPORTS-044 project without bugs: only No bugs in beta", () => {
    show(bugsReport({ project: "beta", figures: { ...bugsReport().figures, total: 0, opened: 0, closed: 0, open_now: 0 }, weeks: [], epics: [], open: [] }));
    expect(screen.getByText("No bugs in beta")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("term")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("REQ-REPORTS-044 only old open bugs: no bars, the epic row, and the bug", () => {
    show(
      bugsReport({
        figures: { total: 1, opened: 0, closed: 0, open_now: 1, oldest_open_days: 90, median_close_days: null },
        weeks: [{ start: "2026-11-16", opened: 0, closed: 0 }],
        epics: [{ id: "e-1", title: "Epic one", opened: 0, closed: 0, open_now: 1 }],
        open: [{ ...bug(1), epic: { id: "e-1", title: "Epic one" } }],
      }),
    );
    expect(within(section("Bugs per week")).getByText("No bugs in this scope")).toBeInTheDocument();
    expect(within(section("Bugs per week")).queryByRole("listitem")).toBeNull();
    expect(within(section("Bugs by epic")).getAllByRole("row")[1]).toHaveTextContent("Epic one001");
    expect(within(section("Open bugs")).getByText("Bug 1")).toBeInTheDocument();
    expect(screen.queryByText(/have no source epic/)).toBeNull();
  });

  it("REQ-REPORTS-044 not started: no bars, no epics, and No open bugs", () => {
    show(
      bugsReport({
        period: null,
        figures: { total: 2, opened: 0, closed: 0, open_now: 0, oldest_open_days: null, median_close_days: null },
        weeks: [],
        epics: [],
        open: [],
      }),
    );
    expect(within(section("Bugs per week")).getByText("No bugs in this scope")).toBeInTheDocument();
    expect(within(section("Bugs by epic")).getByText("No bugs in this scope")).toBeInTheDocument();
    expect(within(section("Open bugs")).getByText("No open bugs")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

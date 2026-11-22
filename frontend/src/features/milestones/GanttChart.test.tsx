import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneDetail } from "./api";
import { GanttChart } from "./GanttChart";
import type { Zoom } from "./gantt";
import { HintProvider } from "@/components/HintProvider";
import { bead } from "@/features/beads/beadFixtures";
import type { BeadSummary } from "@/features/beads/api";
import { detail, epicPlan } from "./milestoneFixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const draw = (plan: MilestoneDetail, zoom: Zoom = "all") =>
  render(<GanttChart project="alpha" plan={plan} preview={false} zoom={zoom} onZoom={vi.fn()} childBeads={new Map()} />);
const scroller = () => document.querySelector<HTMLElement>("[data-scroller]") ?? document.body;
const range = () => document.querySelector("[data-range]")?.textContent;
const arrow = (from: string, to: string) => document.querySelector<SVGPathElement>(`path[data-from="${from}"][data-to="${to}"]`);
const epicRow = (id: string) => document.querySelector<HTMLElement>(`[data-epic="${id}"]`) ?? document.body;

const MONTH = detail([epicPlan("e-a", { planned_start: "2026-11-02", planned_end: "2026-11-27", estimate_days: 20 })], {
  end: "2026-11-27",
  finish: "2026-11-27",
});

const drawKids = (kids: Record<string, BeadSummary[]>, child_counts: BeadSummary["child_counts"]) =>
  render(
    <GanttChart
      project="alpha"
      plan={detail([epicPlan("e-a"), epicPlan("e-b")])}
      preview={false}
      zoom="all"
      onZoom={vi.fn()}
      childBeads={new Map(Object.entries(kids))}
      epicBeads={new Map([["e-a", bead("e-a", { child_counts })]])}
    />,
  );
const track = (id: string, status = "open") => bead(id, { parent: "e-a", status, labels: ["track:1"] });
const prep = (id: string, status = "open") => bead(id, { parent: "e-a", status, labels: ["prep"] });

describe("GanttChart", () => {
  it("REQ-BEADS-021 an open epic whose bead is blocked shows the Blocked look; a closed one does not", () => {
    const epicBeads = new Map([
      ["e-a", bead("e-a", { blocked: true })],
      ["e-b", bead("e-b", { blocked: true, status: "closed" })],
    ]);
    render(
      <GanttChart
        project="alpha"
        plan={detail([epicPlan("e-a"), epicPlan("e-b", { status: "closed" }), epicPlan("e-c")])}
        preview={false}
        zoom="all"
        onZoom={vi.fn()}
        childBeads={new Map()}
        epicBeads={epicBeads}
      />,
    );
    expect(within(epicRow("e-a")).getByRole("img", { name: "Blocked" })).toBeInTheDocument();
    expect(within(epicRow("e-b")).getByRole("img", { name: "Closed" })).toBeInTheDocument();
    expect(within(epicRow("e-c")).getByRole("img", { name: "Open" })).toBeInTheDocument();
  });

  it("REQ-UI-130 the epic row says 3 of 5 done from the child counts of its bead, not from the loaded children", () => {
    const epicBeads = new Map([["e-a", bead("e-a", { child_counts: { total: 5, closed: 3, prep_total: 0, prep_closed: 0 } })]]);
    render(<GanttChart project="alpha" plan={detail([epicPlan("e-a")])} preview={false} zoom="all" onZoom={vi.fn()} childBeads={new Map([["e-a", [track("e-a.4")]]])} epicBeads={epicBeads} />);
    expect(epicRow("e-a")).toHaveTextContent("3/5");
  });

  it("REQ-MILESTONE-UI-015 tracks and prep counted apart; prep rows carry a Prep chip", async () => {
    drawKids({ "e-a": [track("e-a.1", "closed"), track("e-a.2"), prep("e-a.3", "closed"), prep("e-a.4")] }, { total: 2, closed: 1, prep_total: 2, prep_closed: 1 });
    expect(within(epicRow("e-a")).getByRole("img", { name: "1 done, 1 ready of 2 tracks" })).toHaveTextContent("1/2");
    expect(epicRow("e-a")).toHaveTextContent("Prep 1/2");
    await userEvent.click(screen.getByRole("button", { name: /child beads of e-a/ }));
    const rows = [...document.querySelectorAll<HTMLElement>("[data-child]")];
    expect(rows.map((r) => r.dataset.child)).toEqual(["e-a.1", "e-a.2", "e-a.3", "e-a.4"]);
    expect(rows.map((r) => r.textContent?.includes("Prep"))).toEqual([false, false, true, true]);
  });

  it("REQ-MILESTONE-UI-015 an epic with only prep tasks: expand button, Prep x/y, no closed count", () => {
    drawKids({ "e-a": [prep("e-a.1", "closed"), prep("e-a.2")] }, { total: 0, closed: 0, prep_total: 2, prep_closed: 1 });
    expect(screen.getByRole("button", { name: /child beads of e-a/ })).toBeInTheDocument();
    expect(epicRow("e-a")).toHaveTextContent("Prep 1/2");
    expect(within(epicRow("e-a")).queryByRole("img", { name: /tracks$/ })).toBeNull();
  });

  it("REQ-MILESTONE-UI-003 the epic row shows spec readiness: confirmed, missing, or nothing when unknown", () => {
    draw(detail([epicPlan("e-a", { spec_confirmed: true }), epicPlan("e-b", { spec_confirmed: false }), epicPlan("e-c")]));
    expect(epicRow("e-a")).toHaveTextContent("Spec approved");
    expect(epicRow("e-a")).not.toHaveTextContent("Spec not approved yet");
    expect(epicRow("e-b")).toHaveTextContent("Spec not approved yet");
    expect(epicRow("e-c")).not.toHaveTextContent(/spec/i);
  });

  it("REQ-MILESTONE-UI-011 today outside the plan: one week opens on the Monday of the plan's first day", () => {
    draw(
      detail([epicPlan("e-a", { planned_start: "2026-11-04", planned_end: "2026-11-06" })], {
        start: "2026-11-04",
        schedule_start: "2026-11-04",
        finish: "2026-11-06",
        today: "2026-10-29",
      }),
      "1w",
    );
    expect(range()).toBe("2 Nov – 8 Nov");
  });

  it("REQ-MILESTONE-UI-012 › steps to the next Monday; ‹ disabled at the start", async () => {
    draw(MONTH, "2w");
    expect(range()).toBe("2 Nov – 15 Nov");
    expect(screen.getByRole("button", { name: "Earlier" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(range()).toBe("16 Nov – 29 Nov");
    expect(screen.getByRole("button", { name: "Later" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Earlier" }));
    expect(range()).toBe("2 Nov – 15 Nov");
  });

  it("REQ-MILESTONE-UI-012 dragging moves the days in view and does not open the link under it", () => {
    draw(MONTH, "1w");
    const el = scroller();
    Object.defineProperty(el, "scrollWidth", { value: 3000 });
    Object.defineProperty(el, "clientWidth", { value: 960 });
    const link = screen.getByRole("link", { name: "e-a" });
    const before = window.location.pathname;
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0, clientX: 700 });
    fireEvent.pointerMove(link, { pointerType: "mouse", clientX: 40 });
    fireEvent.pointerUp(link, { pointerType: "mouse", clientX: 40 });
    fireEvent.click(link);
    expect(window.location.pathname).toBe(before);
    expect(el.scrollLeft).toBe(660);
    fireEvent.scroll(el);
    expect(range()).toBe("9 Nov – 15 Nov");
  });

  it("REQ-MILESTONE-UI-012 a move under 4 px is a click", () => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1");
    draw(MONTH, "1w");
    const el = scroller();
    Object.defineProperty(el, "scrollWidth", { value: 3000 });
    Object.defineProperty(el, "clientWidth", { value: 960 });
    const link = screen.getByRole("link", { name: "e-a" });
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0, clientX: 700 });
    fireEvent.pointerMove(link, { pointerType: "mouse", clientX: 697 });
    fireEvent.pointerUp(link, { pointerType: "mouse", clientX: 697 });
    fireEvent.click(link);
    expect(window.location.pathname).toBe("/beads/alpha/e-a");
    expect(el.scrollLeft).toBe(0);
  });

  it("REQ-MILESTONE-UI-011 a bar moves with its days at once: no transition lags it behind the columns on resize or zoom", () => {
    draw(MONTH, "2w");
    const bar = epicRow("e-a").querySelector("[data-bar]");
    expect(bar).toBeInstanceOf(HTMLElement);
    expect(bar?.className).not.toMatch(/transition|duration-/);
    expect(bar?.querySelector("[data-overflow]")).toBeNull();
  });

  it("REQ-MILESTONE-UI-003 One bar per epic: Thursday to Wednesday is one element across the weekend, in the state's fill", () => {
    draw(detail([epicPlan("e-a", { status: "in_progress", planned_start: "2026-11-05", planned_end: "2026-11-11", estimate_days: 5 })]));
    const bars = epicRow("e-a").querySelectorAll<HTMLElement>("[data-bar]");
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveClass("bg-state-progress", "rounded-full");
  });

  it.each([
    ["open", "border-state-ready"],
    ["in_progress", "bg-state-progress"],
    ["blocked", "bg-state-blocked"],
    ["closed", "bg-state-done"],
    ["deferred", "border-state-deferred"],
  ])("REQ-MILESTONE-UI-003 a %s epic's bar takes the look of its state glyph", (status, cls) => {
    draw(detail([epicPlan("e-a", { status })]));
    expect(epicRow("e-a").querySelector("[data-bar]")).toHaveClass(cls);
  });

  it("REQ-MILESTONE-UI-003 overflow shown: the part of the bar past the end line is hatched, and the verdict reads the overflow", () => {
    draw(
      detail([epicPlan("e-a", { planned_start: "2026-11-02", planned_end: "2026-11-06", estimate_days: 5, warnings: [{ code: "overflow", days: 2, count: null }] })], {
        end: "2026-11-04",
        finish: "2026-11-06",
      }),
    );
    const bar = epicRow("e-a").querySelector<HTMLElement>("[data-bar]");
    const hatch = bar?.querySelector<HTMLElement>("[data-overflow]");
    const endLine = document.querySelector<HTMLElement>("[data-line=end]");
    expect(hatch).not.toBeNull();
    // the bar starts on the first column (x 0) and the label column is 300px: the hatch covers what the bar has past the end line
    expect(parseFloat(hatch?.style.width ?? "")).toBe(parseFloat(bar?.style.width ?? "") - (parseFloat(endLine?.style.left ?? "") - 300));
    expect(epicRow("e-a").querySelector("[data-verdict]")).toHaveTextContent("2 working days past the end");
  });

  it("REQ-MILESTONE-UI-003 a bar that starts after the end line is hatched whole, inside the bar", () => {
    draw(
      detail([epicPlan("e-a", { planned_start: "2026-11-09", planned_end: "2026-11-10", estimate_days: 2, warnings: [{ code: "overflow", days: 2, count: null }] })], {
        end: "2026-11-04",
        finish: "2026-11-10",
      }),
    );
    const bar = epicRow("e-a").querySelector<HTMLElement>("[data-bar]");
    expect(bar).toHaveClass("overflow-hidden");
    expect(bar?.querySelector<HTMLElement>("[data-overflow]")?.style.width).toBe(bar?.style.width);
  });

  it("REQ-MILESTONE-UI-003 the hatch on a blocked bar is drawn in the card colour so that it shows", () => {
    draw(detail([epicPlan("e-a", { status: "blocked", planned_start: "2026-11-02", planned_end: "2026-11-06" })], { end: "2026-11-04", finish: "2026-11-06" }));
    expect(epicRow("e-a").querySelector("[data-overflow]")?.className).toContain("var(--card)");
    expect(epicRow("e-a").querySelector("[data-overflow]")?.className).not.toContain("var(--state-blocked)");
  });

  it("REQ-MILESTONE-UI-003 a bar that ends before the end line has no hatch", () => {
    draw(detail([epicPlan("e-a")]));
    expect(epicRow("e-a").querySelector("[data-overflow]")).toBeNull();
  });

  it("REQ-MILESTONE-UI-024 Several warnings: one verdict with the dashed ring and +2, the tooltip lists every line in order", () => {
    render(
      <HintProvider>
        <GanttChart
          project="alpha"
          plan={detail([
            epicPlan("e-a", {
              warnings: [
                { code: "spec_due", days: null, count: null },
                { code: "open_bugs", days: null, count: 2 },
                { code: "overflow", days: 2, count: null },
              ],
            }),
          ])}
          preview={false}
          zoom="all"
          onZoom={vi.fn()}
          childBeads={new Map()}
        />
      </HintProvider>,
    );
    const verdicts = epicRow("e-a").querySelectorAll<HTMLElement>("[data-verdict]");
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]).toHaveTextContent("2 working days past the end+2");
    expect(verdicts[0]).toHaveAttribute("tabindex", "0");
    expect(verdicts[0].querySelector("[data-glyph=deferred]")).not.toBeNull();
    const tip = document.getElementById(verdicts[0].getAttribute("aria-describedby") ?? "");
    expect(tip?.textContent).toBe("2 working days past the end\n2 open bugs\nSpec due before kick-off");
  });

  it("REQ-MILESTONE-UI-024 Late comes first: the Blocked glyph and +1", () => {
    draw(
      detail(
        [
          epicPlan("e-b", {
            planned_end: "2026-11-12",
            warnings: [
              { code: "unestimated", days: null, count: null },
              { code: "late", days: null, count: null },
            ],
          }),
        ],
        { today: "2026-11-20" },
      ),
    );
    const verdict = epicRow("e-b").querySelector("[data-verdict]");
    expect(verdict).toHaveTextContent("Late: should have finished 12 Nov+1");
    expect(verdict?.querySelector("[data-glyph=blocked]")).not.toBeNull();
  });

  it("REQ-MILESTONE-UI-024 No warnings: no verdict, and the row is as tall as a row with warnings", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    draw(detail([epicPlan("e-c"), epicPlan("e-d", { warnings: [{ code: "late", days: null, count: null }, { code: "open_bugs", days: null, count: 1 }, { code: "unestimated", days: null, count: null }] })]));
    expect(epicRow("e-c").querySelector("[data-verdict]")).toBeNull();
    expect(epicRow("e-c").style.height).toBe(epicRow("e-d").style.height);
  });

  it("REQ-MILESTONE-UI-013 title line, then id, period and estimate; the title after a short bar", () => {
    const title = "Process hygiene: consistent skills, rules that bind where it matters";
    draw(detail([epicPlan("gin-workflow-rm-process-hygiene", { title, planned_start: "2026-11-02", planned_end: "2026-11-02", estimate_days: 1 })]));
    const li = epicRow("gin-workflow-rm-process-hygiene");
    const [first, second] = li.querySelectorAll(":scope > div > div > span");
    expect(first).toHaveTextContent(title);
    expect(first.querySelector(`[title="${title}"]`)).toHaveClass("truncate");
    expect(second).toHaveTextContent("gin-workflow-rm-process-hygiene1d2 Nov");
    expect(second).toHaveClass("whitespace-nowrap", "min-w-0", "overflow-hidden");
    expect([...second.children].slice(1).map((part) => part.textContent)).toEqual(["1d", "2 Nov"]);
    expect(li.querySelector("[data-tail]")).toHaveTextContent(title);
  });

  it("REQ-MILESTONE-UI-013 long id: the meta line wraps below lg, its spans carry a title, the id is shortened", () => {
    const id = "gin-workflow-rm-process-hygiene-and-more-things";
    draw(detail([epicPlan(id, { planned_start: "2026-11-02", planned_end: "2026-11-02", estimate_days: 1 })]));
    const meta = epicRow(id).querySelector<HTMLElement>(":scope > div > div > span:nth-child(2)");
    expect(meta).toHaveClass("flex-wrap", "lg:flex-nowrap");
    const [idLabel, , period] = Array.from(meta?.children ?? []);
    expect(idLabel).toHaveClass("lg:min-w-16", "lg:shrink-[100]");
    expect(period).toHaveAttribute("title", "2 Nov");
    expect(period).toHaveClass("min-w-0", "shrink", "truncate");
    expect(idLabel).toHaveAttribute("title", id);
    expect(idLabel).toHaveTextContent("gin-workflow-r…re-things");
    expect(screen.getByRole("link", { name: id })).toHaveAttribute("href", `/beads/alpha/${id}`);
  });

  it("REQ-MILESTONE-UI-013 below lg the rows grow so that wrapped labels do not overlap the next row, the same for rows with and without a verdict", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    draw(
      detail([
        epicPlan("e-a", { spec_confirmed: false, warnings: [{ code: "late", days: null, count: null }] }),
        epicPlan("e-b", { spec_confirmed: true }),
        epicPlan("e-c"),
      ]),
    );
    const rows = ["e-a", "e-b", "e-c"].map((id) => epicRow(id));
    // rows stack in flow: their heights are their tops (jsdom has no layout)
    expect(rows.map((row) => row.style.height)).toEqual(["104px", "104px", "88px"]);
    expect(within(rows[0]).getByText(/^Late: should have finished/)).toBeInTheDocument();
  });

  const labelOf = (id: string) => epicRow(id).firstElementChild as HTMLElement;
  const stubWindow = (width: number) =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: width >= Number(/min-width: (\d+)px/.exec(query)?.[1]),
      addEventListener() {},
      removeEventListener() {},
    }));
  const E3 = epicPlan("ex-e3", {
    status: "in_progress",
    points: 8,
    estimate_days: 20,
    remaining_days: 11,
    spec_confirmed: false,
    planned_start: "2026-11-09",
    planned_end: "2026-11-23",
    warnings: [{ code: "spec_not_ready", days: null, count: null }],
  });
  const EPIC_BEADS = new Map([["ex-e3", bead("ex-e3", { child_counts: { total: 2, closed: 1, prep_total: 0, prep_closed: 0 } })]]);
  const TRACKS = new Map([["ex-e3", [track("ex-e3.1", "closed"), track("ex-e3.2")].map((b) => ({ ...b, parent: "ex-e3" }))]]);

  it("REQ-MILESTONE-UI-013 label column width by window: 300 under 1280, 380 from 1280, 440 from 1600", () => {
    const widths = [1024, 1279, 1280, 1599, 1600, 2000].map((width) => {
      stubWindow(width);
      const { unmount } = draw(detail([E3]));
      const label = labelOf("ex-e3").style.width;
      unmount();
      return label;
    });
    expect(widths).toEqual(["300px", "300px", "380px", "380px", "440px", "440px"]);
  });

  it("REQ-UI-141 the today line and chip are the identity colour", () => {
    stubWindow(2000);
    render(<GanttChart project="alpha" plan={detail([E3], { today: "2026-11-12" })} preview={false} zoom="all" onZoom={vi.fn()} childBeads={TRACKS} epicBeads={EPIC_BEADS} />);
    expect(document.querySelector("[data-line=today]")).toHaveClass("border-identity");
    expect(document.querySelector("[data-chip=today] span")).toHaveClass("bg-identity");
  });

  it("REQ-MILESTONE-UI-013 Wide window: id, then '8 pt, 11d left', cut inside the column, no spec item", () => {
    stubWindow(2000);
    render(<GanttChart project="alpha" plan={detail([E3], { today: "2026-11-12" })} preview={false} zoom="all" onZoom={vi.fn()} childBeads={TRACKS} epicBeads={EPIC_BEADS} />);
    expect(labelOf("ex-e3").style.width).toBe("440px");
    const meta = labelOf("ex-e3").querySelector<HTMLElement>(":scope > div > span:nth-child(2)");
    expect(meta).toHaveClass("min-w-0", "overflow-hidden", "lg:flex-nowrap");
    const parts = [...(meta?.children ?? [])].map((part) => part.textContent);
    expect(parts).toEqual(["ex-e3", "8 pt, 11d left", "9 Nov – 23 Nov", "1/2"]);
    expect(meta?.children[1]).toHaveClass("shrink-0");
    expect(epicRow("ex-e3")).not.toHaveTextContent("Spec not approved yet");
    expect(epicRow("ex-e3")).toHaveTextContent("Spec not confirmed");
    // the row label is an opaque layer above the lines
    expect(labelOf("ex-e3")).toHaveClass("sticky", "z-10", "bg-card");
  });

  it("REQ-MILESTONE-UI-013 the size badge without points reads '<n>d', '<n>d left' or 'assumed <n>d', as plain text", () => {
    draw(detail([epicPlan("e-a", { estimate_days: 4 }), epicPlan("e-b", { estimate_days: null, assumed_days: 3 })]));
    expect(within(epicRow("e-a")).getByText("4d").closest("[data-slot='badge']")).toBeNull();
    expect(within(epicRow("e-b")).getByText("assumed 3d").closest("[data-slot='badge']")).toBeNull();
  });

  it("REQ-MILESTONE-UI-013 Tail title stops at the end line: it is cut short before the line", () => {
    const title = "A very long epic title that cannot fit between the bar and the end line";
    draw(detail([epicPlan("e-a", { title, planned_start: "2026-11-02", planned_end: "2026-11-02", estimate_days: 1 })], { end: "2026-11-10", finish: "2026-11-13", today: "2026-11-20" }));
    const tail = epicRow("e-a").querySelector<HTMLElement>("[data-tail]");
    const endLine = document.querySelector<HTMLElement>("[data-line=end]");
    const label = 300;
    const room = parseFloat(endLine?.style.left ?? "") - label - parseFloat(tail?.style.left ?? "");
    expect(tail).toHaveClass("truncate");
    expect(parseFloat(tail?.style.maxWidth ?? "")).toBeGreaterThan(0);
    expect(parseFloat(tail?.style.maxWidth ?? "")).toBeLessThanOrEqual(room - 8);
  });

  it("REQ-MILESTONE-UI-013 the End chip sits on its own row of the header, the lines start under it", () => {
    draw(MONTH);
    const chip = document.querySelector<HTMLElement>("[data-chip=end]");
    expect(chip).toHaveTextContent("End 27 Nov");
    expect(chip).toHaveClass("top-[22px]");
    expect(document.querySelector<HTMLElement>("[data-line=end]")?.style.top).toBe("61px");
    expect(document.querySelector("[data-line=end]")).toBeEmptyDOMElement();
  });

  it("REQ-MILESTONE-UI-013 points", () => {
    draw(
      detail([
        epicPlan("e-c", { points: 5, estimate_days: 7 }),
        epicPlan("e-d", { status: "in_progress", points: 3, estimate_days: 4, remaining_days: 1 }),
        epicPlan("e-e", { estimate_days: 2 }),
      ]),
    );
    expect(epicRow("e-c")).toHaveTextContent("5 pt, 7d");
    expect(epicRow("e-d")).toHaveTextContent("3 pt, 1d left");
    expect(epicRow("e-e")).not.toHaveTextContent("pt");
  });

  it("REQ-MILESTONE-UI-013 remaining and assumed days", () => {
    draw(
      detail([
        epicPlan("e-a", { status: "in_progress", estimate_days: 5, remaining_days: 2 }),
        epicPlan("e-b", { estimate_days: null, assumed_days: 3 }),
        epicPlan("e-c", { status: "in_progress", estimate_days: 5, remaining_days: 5 }),
      ]),
    );
    expect(epicRow("e-a")).toHaveTextContent("2d left");
    expect(epicRow("e-b")).toHaveTextContent("assumed 3d");
    expect(epicRow("e-c")).toHaveTextContent("5d");
    expect(epicRow("e-c")).not.toHaveTextContent("left");
  });

  it("REQ-MILESTONE-UI-003 newer warnings name the integration date", () => {
    draw(detail([epicPlan("e-a", { warnings: [{ code: "after_integration", days: null, count: null }] })], { integration: "2026-11-24" }));
    expect(epicRow("e-a")).toHaveTextContent("Ends after integration on 24 Nov");
  });

  it("REQ-MILESTONE-UI-013 no title after a bar that reaches the end", () => {
    draw(MONTH);
    expect(epicRow("e-a").querySelector("[data-tail]")).toBeNull();
  });

  const CHAIN = detail([
    epicPlan("A", { planned_start: "2026-11-02", planned_end: "2026-11-02" }),
    epicPlan("B", { planned_start: "2026-11-03", planned_end: "2026-11-03", depends_on: ["A", "X"] }),
    epicPlan("C", { planned_start: "2026-11-04", planned_end: "2026-11-05", depends_on: ["B"] }),
    epicPlan("D", { planned_start: "2026-11-05", planned_end: "2026-11-05", depends_on: ["C"] }),
    epicPlan("E", { planned_start: "2026-11-09", planned_end: "2026-11-09" }),
  ]);

  it("REQ-MILESTONE-UI-014 an arrow per in-milestone dependency; late ones in the blocked color", () => {
    draw(CHAIN);
    expect([...document.querySelectorAll("path[data-from]")].map((p) => `${p.getAttribute("data-from")}>${p.getAttribute("data-to")}`)).toEqual([
      "A>B",
      "B>C",
      "C>D",
    ]);
    expect(arrow("A", "B")).not.toHaveAttribute("data-late");
    expect(arrow("C", "D")).toHaveAttribute("data-late", "true");
    expect(arrow("C", "D")).toHaveClass("text-state-blocked");
    expect(document.querySelector('path[data-from="X"]')).toBeNull();
  });

  it("REQ-MILESTONE-UI-014 pointing at an epic highlights its chain and fades the rest", () => {
    draw(CHAIN);
    fireEvent.mouseEnter(epicRow("B"));
    expect(["A", "B", "C", "D"].map((id) => epicRow(id).hasAttribute("data-faded"))).toEqual([false, false, false, false]);
    expect(epicRow("E")).toHaveAttribute("data-faded", "true");
    expect(arrow("A", "B")).toHaveAttribute("data-state", "hot");
    fireEvent.mouseLeave(screen.getByRole("list", { name: "Epics" }));
    expect(epicRow("E")).not.toHaveAttribute("data-faded");
    expect(arrow("A", "B")).not.toHaveAttribute("data-state");
  });

  it("REQ-MILESTONE-UI-014 focus inside a row highlights its chain", () => {
    draw(CHAIN);
    act(() => screen.getByRole("link", { name: "E" }).focus());
    expect(epicRow("A")).toHaveAttribute("data-faded", "true");
    expect(arrow("A", "B")).toHaveAttribute("data-state", "faded");
  });

  it("REQ-UI-109 the epic label shows the Technical badge when its bead has that kind", () => {
    render(
      <GanttChart
        project="alpha"
        plan={detail([epicPlan("e-a"), epicPlan("e-b")])}
        preview={false}
        zoom="all"
        onZoom={vi.fn()}
        childBeads={new Map()}
        kinds={new Map([["e-a", "technical"]])}
      />,
    );
    const row = within(epicRow("e-a"));
    const badge = row.getByText("Technical");
    // on the meta line beside the id, so the title keeps its whole line
    expect(badge.closest("[title='Technical']")?.parentElement).toBe(row.getByTitle("e-a").parentElement);
    expect(row.getByTitle("Title e-a")).not.toContainElement(badge);
    expect(epicRow("e-b")).not.toHaveTextContent("Technical");
  });
});

describe("GanttChart lanes", () => {
  it("REQ-MILESTONE-UI-015 REQ-UI-115 merge gate and lane: the child row has the lane chip", async () => {
    drawKids({ "e-a": [bead("e-a.1", { parent: "e-a", lane: "be", labels: ["track:1"], track: { plan: null, number: 1 } })] }, { total: 1, closed: 0, prep_total: 0, prep_closed: 0 });
    await userEvent.click(screen.getByRole("button", { name: /child bead of e-a/ }));
    const row = document.querySelector<HTMLElement>("[data-child='e-a.1']") ?? document.body;
    expect(within(row).getByText("be")).toBeInTheDocument();
  });
});

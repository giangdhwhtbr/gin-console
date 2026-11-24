import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { ReworkSection } from "./ReworkSection";
import { report } from "./reportFixtures";

afterEach(cleanup);

const base = report();
const member = { member: "ann", closed: 4, reopens: 1, bugs: 0, rework_rate: 0.25 };

describe("ReworkSection", () => {
  it("REQ-UI-091 figures: the rate from the totals, reopens and bugs summed over the member rows", () => {
    const r = report({
      totals: { closed: 5, rework_rate: 0.4 },
      quality: { ...base.quality, members: [member, { member: "bao", closed: 1, reopens: 0, bugs: 1, rework_rate: 1 }] },
    });
    render(<ReworkSection report={r} />);
    for (const [label, value] of [["Rework rate", "40%"], ["Reopens", "1"], ["Bugs found later", "1"]]) {
      expect(screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent).toBe(value);
    }
  });

  it("REQ-UI-091 each figure carries its definition in a tooltip", () => {
    render(
      <HintProvider>
        <ReworkSection report={base} />
      </HintProvider>,
    );
    expect(screen.getByText("Rework rate", { selector: "dt" }).nextElementSibling).toHaveAttribute("data-hint", DEFINITIONS.rework);
    expect(screen.getByText("Reopens", { selector: "dt" }).nextElementSibling).toHaveAttribute("data-hint", DEFINITIONS.reopens);
    expect(screen.getByText("Bugs found later", { selector: "dt" }).nextElementSibling).toHaveAttribute("data-hint", DEFINITIONS.bugsFound);
  });

  it("REQ-UI-091 member and epic tables", () => {
    render(<ReworkSection report={base} />);
    expect(screen.getByRole("row", { name: /ann 4 1 0 25%/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Epic one 2 1 0 50%/ })).toBeInTheDocument();
  });

  it("REQ-UI-091 open an epic: its title links to its bead page", () => {
    render(<ReworkSection report={base} />);
    expect(screen.getByRole("link", { name: "Epic one" })).toHaveAttribute("href", "/beads/alpha/a-e1");
  });

  it("REQ-UI-091 nothing closed: the rate reads a dash and each table says so", () => {
    const empty = report({ totals: { closed: 0, rework_rate: null }, quality: { members: [], epics: [] } });
    render(<ReworkSection report={empty} />);
    expect(screen.getByText("Rework rate", { selector: "dt" }).nextElementSibling?.textContent).toBe("—");
    expect(screen.getAllByText("No data in this scope")).toHaveLength(2);
  });

  it("REQ-UI-091 shows no tokens, review cycles, rejections, findings or waivers", () => {
    render(<ReworkSection report={base} />);
    expect(screen.queryByText(/tokens|review|rejection|finding|waiver/i)).toBeNull();
    expect(within(screen.getByRole("region", { name: "Rework by member" })).getByText("ann")).toBeInTheDocument();
  });
});

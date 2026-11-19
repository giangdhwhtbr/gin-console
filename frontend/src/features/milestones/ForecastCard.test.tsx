import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ForecastCard } from "./ForecastCard";
import { forecast } from "./milestoneFixtures";

afterEach(cleanup);
const TODAY = "2026-11-08";
const card = () => screen.getByRole("region", { name: "Project forecast" });

describe("ForecastCard", () => {
  it("REQ-MILESTONE-UI-016 on time with a deadline", () => {
    render(<ForecastCard forecast={forecast({ lanes: 2, open_epics: 5, unestimated: 0 })} today={TODAY} />);
    expect(card()).toHaveTextContent("Finishes 23 Dec");
    expect(card()).toHaveTextContent("6 working days spare");
    expect(card()).toHaveTextContent("2 lanes");
    expect(card()).toHaveTextContent("5 open epics");
    expect(card()).toHaveTextContent("0 unestimated");
    expect(screen.queryByRole("img", { name: "Warning" })).toBeNull();
  });

  it("REQ-MILESTONE-UI-016 past the deadline", () => {
    render(<ForecastCard forecast={forecast({ finish: "2027-01-07", overflow_days: 5 })} today={TODAY} />);
    const late = screen.getByText("5 working days past the deadline");
    expect(late).toHaveClass("text-state-blocked");
    expect(card()).toHaveTextContent("Finishes 7 Jan 2027");
  });

  it("REQ-MILESTONE-UI-016 on the deadline", () => {
    render(<ForecastCard forecast={forecast({ finish: "2026-12-31" })} today={TODAY} />);
    expect(card()).toHaveTextContent("on the deadline");
  });

  it("REQ-MILESTONE-UI-016 no deadline", () => {
    render(<ForecastCard forecast={forecast({ deadline: null, finish: "2026-11-20" })} today={TODAY} />);
    expect(card()).toHaveTextContent("Finishes 20 Nov");
    expect(card()).toHaveTextContent("No deadline");
    expect(screen.getByText("- Deadline: YYYY-MM-DD")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-016 every epic unestimated", () => {
    render(<ForecastCard forecast={forecast({ finish: null, open_epics: 2, unestimated: 2 })} today={TODAY} />);
    expect(card()).toHaveTextContent("No estimate: every open epic is unestimated");
    expect(card()).toHaveTextContent("2 unestimated");
    expect(screen.getByRole("img", { name: "Warning" })).toBeInTheDocument();
    expect(card()).not.toHaveTextContent(/spare|past the deadline|on the deadline/);
  });

  it("REQ-MILESTONE-UI-016 forecast error", () => {
    const error = "Deadline: soon is not a date (YYYY-MM-DD)";
    render(<ForecastCard forecast={forecast({ error, deadline: null, finish: "2026-11-20" })} today={TODAY} />);
    expect(screen.getByText(error)).toHaveClass("text-destructive");
    expect(card()).toHaveTextContent("Finishes 20 Nov");
  });

  it("REQ-UI-110 the finish date is prominent; the figures are label/value pairs, label muted, value strong", () => {
    render(<ForecastCard forecast={forecast({ unestimated: 2 })} today={TODAY} />);
    expect(screen.getByText("Finishes 23 Dec")).toHaveClass("text-2xl", "font-bold");
    for (const [label, value] of [["Default lanes", "2 lanes"], ["Open epics", "5 open epics"], ["Unestimated", "2 unestimated"]]) {
      const term = screen.getByText(label);
      expect(term.tagName).toBe("DT");
      expect(term).toHaveClass("text-muted-foreground");
      expect(term.nextElementSibling).toHaveClass("font-medium");
      expect(term.nextElementSibling).toHaveTextContent(value);
    }
    expect(screen.getByRole("img", { name: "Warning" }).parentElement).toHaveClass("text-state-blocked");
  });

  it("REQ-UI-110 exact label to value texts of the card", () => {
    const pairs = () => [...card().querySelectorAll("dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);
    const { rerender } = render(<ForecastCard forecast={forecast({ unestimated: 2 })} today={TODAY} daysPerPoint={{ value: 1.4, measured_epics: 3, assumed: false }} />);
    expect(pairs()).toEqual([
      ["Default lanes", "2 lanes"],
      ["Open epics", "5 open epics"],
      ["Unestimated", "2 unestimated"],
      ["Days per point", "1.4"],
    ]);
    expect(screen.getByText("Project forecast · open roadmap epics")).toBeInTheDocument();
    expect(screen.getByText("Deadline 31 Dec")).toBeInTheDocument();
    rerender(<ForecastCard forecast={forecast({ deadline: null })} today={TODAY} daysPerPoint={{ value: 1, measured_epics: 0, assumed: true }} />);
    expect(screen.getByText("No deadline").parentElement).toHaveTextContent("No deadline add - Deadline: YYYY-MM-DD to the roadmap");
    expect(pairs().at(-1)).toEqual(["Days per point", "1.0 (assumed)"]);
  });

  it("REQ-MILESTONE-UI-016 no forecast", () => {
    const { container } = render(<ForecastCard forecast={null} today={TODAY} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-MILESTONE-UI-016 days per point", () => {
    const { rerender } = render(<ForecastCard forecast={forecast()} today={TODAY} daysPerPoint={{ value: 1.4, measured_epics: 3, assumed: false }} />);
    expect(screen.getByText("Days per point").nextElementSibling).toHaveTextContent("1.4");
    expect(card()).not.toHaveTextContent("(assumed)");
    rerender(<ForecastCard forecast={forecast()} today={TODAY} daysPerPoint={{ value: 1, measured_epics: 0, assumed: true }} />);
    expect(screen.getByText("Days per point").nextElementSibling).toHaveTextContent("1.0 (assumed)");
    rerender(<ForecastCard forecast={forecast()} today={TODAY} daysPerPoint={null} />);
    expect(card()).not.toHaveTextContent("per point");
    rerender(<ForecastCard forecast={forecast()} today={TODAY} />);
    expect(card()).not.toHaveTextContent("per point");
  });
});

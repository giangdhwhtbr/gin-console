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

  it("REQ-MILESTONE-UI-016 no forecast", () => {
    const { container } = render(<ForecastCard forecast={null} today={TODAY} />);
    expect(container).toBeEmptyDOMElement();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { forecast } from "./milestoneFixtures";
import { ProjectFinish } from "./ProjectFinish";

afterEach(cleanup);

describe("ProjectFinish", () => {
  it("REQ-MILESTONE-UI-034 late against the deadline: finish, deadline and the working days late with a warning icon", () => {
    const { container } = render(
      <ProjectFinish forecast={forecast({ finish: "2026-12-22", deadline: "2026-12-11", overflow_days: 7 })} today="2026-11-26" />,
    );
    expect(screen.getByText("Project finishes 22 Dec")).toBeInTheDocument();
    expect(screen.getByText("deadline 11 Dec")).toBeInTheDocument();
    expect(screen.getByText("7 working days late")).toBeInTheDocument();
    expect(container.querySelector('svg[data-glyph="deferred"]')).not.toBeNull();
  });

  it("REQ-MILESTONE-UI-034 no deadline: the finish and nothing more", () => {
    const { container } = render(
      <ProjectFinish forecast={forecast({ finish: "2027-01-19", deadline: null, overflow_days: 0 })} today="2027-01-05" />,
    );
    expect(screen.getByText("Project finishes 19 Jan")).toBeInTheDocument();
    expect(screen.queryByText(/deadline/)).not.toBeInTheDocument();
    expect(screen.queryByText(/late/)).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("REQ-MILESTONE-UI-034 a deadline that holds shows no days late", () => {
    render(<ProjectFinish forecast={forecast({ finish: "2026-12-01", deadline: "2026-12-11", overflow_days: 0 })} today="2026-11-26" />);
    expect(screen.getByText("deadline 11 Dec")).toBeInTheDocument();
    expect(screen.queryByText(/late/)).not.toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-034 without a finish it says so", () => {
    render(<ProjectFinish forecast={forecast({ finish: null, deadline: null })} today="2026-11-26" />);
    expect(screen.getByText("Project finish not estimated")).toBeInTheDocument();
    expect(screen.queryByText(/Project finishes/)).not.toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-034 forecast error: the error in the destructive color in place of the line", () => {
    render(<ProjectFinish forecast={forecast({ error: "dependency cycle: e-1 -> e-2 -> e-1" })} today="2026-11-26" />);
    const error = screen.getByText("Forecast unavailable: dependency cycle: e-1 -> e-2 -> e-1");
    expect(error).toHaveClass("text-destructive");
    expect(screen.queryByText(/Project finish/)).not.toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-034 no forecast: no line", () => {
    const { container } = render(<ProjectFinish forecast={null} today="2026-11-26" />);
    expect(container).toBeEmptyDOMElement();
  });
});

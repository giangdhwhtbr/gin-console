import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReportErrors } from "./ReportErrors";

afterEach(cleanup);

describe("ReportErrors", () => {
  it("REQ-UI-093 renders nothing without errors", () => {
    const { container } = render(<ReportErrors errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-UI-093 names each project with its error", () => {
    render(<ReportErrors errors={[{ project: "beta", error: "bd failed" }, { project: "gamma", error: "no snapshot" }]} />);
    expect(screen.getByText("Some projects could not be read")).toBeInTheDocument();
    expect(screen.getByText("beta: bd failed")).toBeInTheDocument();
    expect(screen.getByText("gamma: no snapshot")).toBeInTheDocument();
  });
});

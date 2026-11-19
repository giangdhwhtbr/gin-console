import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VelocityFigures } from "./VelocityFigures";
import { vel } from "./velocityFixtures";

afterEach(cleanup);

describe("VelocityFigures", () => {
  it("REQ-UI-110 Contrast: the milestone id is not faded with an opacity class", () => {
    render(<VelocityFigures daysPerPoint={null} latest={{ id: "ex-m2", title: "Two", start: null, velocity: vel() }} />);
    const ids = screen.getAllByText("ex-m2");
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(id.className).not.toMatch(/opacity-/);
  });
});

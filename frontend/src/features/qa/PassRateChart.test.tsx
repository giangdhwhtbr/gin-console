import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PassRateChart } from "./PassRateChart";

afterEach(cleanup);

describe("PassRateChart", () => {
  it("REQ-QA-018 nine capabilities: a name with a dot is drawn and the 9th line cycles back to the first colour", () => {
    const names = ["a.b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const rows = names.map((name) => ({ name, points: [{ date: "2026-06-01", passed: 1, failed: 0, rate: 1 }, { date: "2026-06-02", passed: 1, failed: 0, rate: 1 }] }));
    const { container } = render(<PassRateChart rows={rows} days={["2026-06-01", "2026-06-02"]} />);
    const strokes = [...container.querySelectorAll("path.recharts-line-curve")].map((path) => path.getAttribute("stroke"));
    expect(strokes).toHaveLength(9);
    expect(strokes[8]).toBe("var(--series-1)");
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LaneChip } from "./LaneChip";

afterEach(cleanup);

describe("LaneChip", () => {
  it("REQ-UI-115 shows the lane with a title and a truncating text", () => {
    render(<LaneChip lane="backend" />);
    const text = screen.getByText("backend");
    expect(text).toHaveClass("truncate");
    expect(text.closest("[title]")).toHaveAttribute("title", "Lane backend");
  });
});

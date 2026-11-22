import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { LaneChip } from "./LaneChip";

afterEach(cleanup);

describe("LaneChip", () => {
  it("REQ-UI-115 REQ-UI-132 shows the lane with a truncating text and the whole lane name in its hint, not a title", () => {
    render(<HintProvider><LaneChip lane="backend" /></HintProvider>);
    const text = screen.getByText("backend");
    expect(text).toHaveClass("truncate");
    const chip = text.closest("[aria-describedby]");
    expect(chip).not.toHaveAttribute("title");
    expect(document.getElementById(chip?.getAttribute("aria-describedby") ?? "")).toHaveTextContent(`Lane backend. ${DEFINITIONS.lane}`);
  });
});

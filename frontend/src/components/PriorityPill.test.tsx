import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriorityPill } from "./PriorityPill";

afterEach(cleanup);

describe("PriorityPill", () => {
  it("REQ-UI-110 REQ-UI-140 Priority: P0 and P1 bold in the text colour, the rest muted, no tint or border", () => {
    render(
      <>
        <PriorityPill priority={0} />
        <PriorityPill priority={1} />
        <PriorityPill priority={2} />
        <PriorityPill priority={9} />
      </>,
    );
    for (const text of ["P0", "P1"]) expect(screen.getByText(text)).toHaveClass("font-semibold", "text-foreground");
    for (const text of ["P2", "P9"]) {
      expect(screen.getByText(text)).toHaveClass("text-muted-foreground");
      expect(screen.getByText(text)).not.toHaveClass("font-semibold");
    }
    for (const text of ["P0", "P1", "P2", "P9"]) {
      expect(screen.getByText(text).className).not.toMatch(/\bbg-|border|rounded/);
      expect(screen.getByText(text)).not.toHaveAttribute("data-slot", "badge");
    }
  });
});

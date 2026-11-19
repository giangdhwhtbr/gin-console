import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriorityPill } from "./PriorityPill";

afterEach(cleanup);

describe("PriorityPill", () => {
  it("REQ-UI-110 Priority pill: P0 destructive, P1 warning, P2 neutral", () => {
    render(
      <>
        <PriorityPill priority={0} />
        <PriorityPill priority={1} />
        <PriorityPill priority={2} />
        <PriorityPill priority={9} />
      </>,
    );
    expect(screen.getByText("P0")).toHaveClass("text-destructive");
    expect(screen.getByText("P1")).toHaveClass("text-state-blocked");
    for (const text of ["P2", "P9"]) {
      expect(screen.getByText(text)).toHaveClass("bg-secondary");
      expect(screen.getByText(text)).not.toHaveClass("text-destructive", "text-state-blocked");
    }
  });
});

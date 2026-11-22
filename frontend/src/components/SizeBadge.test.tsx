import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SizeBadge } from "./SizeBadge";

afterEach(cleanup);

describe("SizeBadge", () => {
  it("REQ-UI-110 shows points as '<p> pt', else days from the estimate", () => {
    const { rerender } = render(<SizeBadge points={8} estimateMinutes={1440} />);
    expect(screen.getByText("8 pt")).toBeInTheDocument();
    rerender(<SizeBadge points={null} estimateMinutes={1440} />);
    expect(screen.getByText("3d")).toBeInTheDocument();
    rerender(<SizeBadge points={null} estimateMinutes={240} />);
    expect(screen.getByText("0.5d")).toBeInTheDocument();
  });

  it("renders nothing without points or estimate", () => {
    const { container } = render(<SizeBadge points={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-UI-140 appends the suffix and gives way before the title", () => {
    render(<SizeBadge points={null} estimateMinutes={5280} suffix="11d left" />);
    const text = screen.getByText("11d, 11d left");
    expect(text).toHaveClass("truncate", "min-w-0", "shrink", "text-muted-foreground");
    expect(text).not.toHaveClass("shrink-0");
    expect(text).not.toHaveAttribute("data-slot", "badge");
  });
});

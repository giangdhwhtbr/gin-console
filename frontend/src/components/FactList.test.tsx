import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FactList } from "./FactList";

afterEach(cleanup);

describe("FactList", () => {
  it("REQ-UI-110 Facts as label and value: label muted, value in the text colour and heavier", () => {
    render(<FactList facts={[{ label: "Owner", value: "alice" }, { label: "Comments", value: 3 }]} />);
    expect(screen.getByText("Owner")).toHaveClass("text-xs", "text-muted-foreground");
    expect(screen.getByText("alice")).toHaveClass("text-sm", "font-medium", "text-foreground");
    expect(screen.getByText("alice").tagName).toBe("DD");
    expect(screen.getByText("Owner").tagName).toBe("DT");
    expect(screen.getByText("3")).toHaveClass("font-medium");
  });

  it("the grid wraps on phones and the inline layout is one wrapping row", () => {
    const { container, rerender } = render(<FactList facts={[{ label: "A", value: "b" }]} />);
    expect(container.querySelector("dl")).toHaveClass("grid", "grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]");
    rerender(<FactList layout="inline" facts={[{ label: "A", value: "b" }]} />);
    expect(container.querySelector("dl")).toHaveClass("flex", "flex-wrap");
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TypeBadge } from "./TypeBadge";

afterEach(cleanup);

describe("TypeBadge", () => {
  it("REQ-UI-067 a bug is the word in the bug colour, without border or tint", () => {
    render(<TypeBadge type="bug" />);
    const word = screen.getByText("bug");
    expect(word).toHaveClass("text-type-bug");
    expect(word).toHaveAttribute("data-type", "bug");
    expect(word.className).not.toMatch(/\bbg-|border|rounded/);
  });

  it.each(["epic", "feature", "task", "chore"])("REQ-UI-067 %s shows nothing on a row", (type) => {
    const { container } = render(<TypeBadge type={type} />);
    expect(container).toBeEmptyDOMElement();
  });
});

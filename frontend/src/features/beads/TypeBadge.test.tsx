import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TypeBadge } from "./TypeBadge";

afterEach(cleanup);

describe("TypeBadge", () => {
  it.each([
    ["epic", "text-type-epic"],
    ["bug", "text-type-bug"],
    ["feature", "text-type-feature"],
    ["task", "text-muted-foreground"],
    ["chore", "text-muted-foreground"],
  ])("REQ-UI-067 %s is coloured with %s and always names the type", (type, tone) => {
    render(<TypeBadge type={type} />);
    const pill = screen.getByText(type);
    expect(pill).toHaveClass(tone);
    expect(pill).toHaveAttribute("data-type", type);
  });
});

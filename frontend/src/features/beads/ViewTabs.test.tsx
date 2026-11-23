import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFilters } from "./filters";
import { ViewTabs } from "./ViewTabs";

afterEach(cleanup);

describe("ViewTabs", () => {
  it("REQ-UI-030 Lanes tab: offered only while the scope has lanes", () => {
    const { rerender } = render(<ViewTabs filters={parseFilters("")} lanes={false} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Lanes" })).toBeNull();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["List", "Board", "Focus", "Graph"]);
    rerender(<ViewTabs filters={parseFilters("")} lanes onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Lanes" })).toBeInTheDocument();
  });

  it("REQ-UI-030 Lanes tab: choosing it sets view=lanes and keeps the filters", async () => {
    const onChange = vi.fn();
    const filters = parseFilters("?q=fix&scope=ex-e12&view=graph");
    render(<ViewTabs filters={filters} lanes onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Lanes" }));
    expect(onChange).toHaveBeenCalledWith({ ...filters, view: "lanes" });
  });

  it("REQ-UI-110 pressed segment: the selected view keeps the primary-foreground text, the others do not", () => {
    render(<ViewTabs filters={parseFilters("?view=board")} lanes={false} onChange={vi.fn()} />);
    const pressed = screen.getByRole("button", { name: "Board" });
    expect(pressed).toHaveAttribute("aria-pressed", "true");
    expect(pressed).toHaveClass("bg-primary", "text-primary-foreground");
    expect(screen.getByRole("button", { name: "List" })).not.toHaveClass("text-primary-foreground");
  });
});

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
});

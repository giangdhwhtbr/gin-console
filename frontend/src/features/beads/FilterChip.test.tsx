import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterChip } from "./FilterChip";

afterEach(cleanup);

describe("FilterChip", () => {
  it("REQ-UI-144 Button without a value", () => {
    render(
      <FilterChip label="Status" values={[]} onRemove={vi.fn()}>
        <p>menu body</p>
      </FilterChip>,
    );
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Status filter" })).toBeNull();
  });

  it("REQ-UI-144 REQ-UI-107 Chip with values", async () => {
    render(
      <FilterChip label="Status" values={["open", "in_progress"]} onRemove={vi.fn()}>
        <p>menu body</p>
      </FilterChip>,
    );
    const body = screen.getByRole("button", { name: "Status open, in_progress" });
    expect(body).toHaveAttribute("title", "Status open, in_progress");
    const value = screen.getByText("open, in_progress");
    expect(value).toHaveClass("truncate", "min-w-0");
    expect(body.parentElement).toHaveClass("bg-identity-wash");
    expect(screen.queryByText("menu body")).toBeNull();
    await userEvent.click(body);
    expect(screen.getByText("menu body")).toBeInTheDocument();
  });

  it("REQ-UI-144 Remove one filter", async () => {
    const onRemove = vi.fn();
    render(
      <FilterChip label="Status" values={["open"]} onRemove={onRemove}>
        <p>menu body</p>
      </FilterChip>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove Status filter" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("menu body")).toBeNull();
  });

  it("REQ-UI-104 Milestones loading", () => {
    render(
      <FilterChip label="Milestone" values={[]} loading onRemove={vi.fn()}>
        <p>menu body</p>
      </FilterChip>,
    );
    expect(screen.getByRole("button", { name: "Milestone…" })).toBeInTheDocument();
  });
});

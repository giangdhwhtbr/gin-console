import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LabelMode } from "./LabelMode";
import { MultiSelectList } from "./MultiSelectList";

describe("MultiSelectList", () => {
  const options = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
  ];

  it("REQ-UI-084 toggles items, selects all, and clears selections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiSelectList values={["open"]} options={options} onChange={onChange} />);

    expect(screen.getByRole("checkbox", { name: "Open" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "In Progress" })).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "In Progress" }));
    expect(onChange).toHaveBeenCalledWith(["open", "in_progress"]);

    onChange.mockClear();
    await user.click(screen.getByRole("checkbox", { name: "Open" }));
    expect(onChange).toHaveBeenCalledWith([]);

    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Select all" }));
    expect(onChange).toHaveBeenCalledWith(["open", "in_progress", "closed"]);

    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("LabelMode", () => {
  it("REQ-UI-085 offers Any and All match mode switch with aria-pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LabelMode mode="any" onChange={onChange} />);

    const anyBtn = screen.getByRole("button", { name: "Any" });
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(anyBtn).toHaveAttribute("aria-pressed", "true");
    expect(allBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(allBtn);
    expect(onChange).toHaveBeenCalledWith("all");
  });
});

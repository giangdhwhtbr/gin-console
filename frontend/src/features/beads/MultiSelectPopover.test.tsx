import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LabelsPopover } from "./LabelsPopover";
import { MobileFiltersSheet } from "./MobileFiltersSheet";
import { MultiSelectPopover } from "./MultiSelectPopover";
import { parseFilters } from "./filters";

describe("MultiSelectPopover", () => {
  const options = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
  ];

  // REQ-UI-084
  it("REQ-UI-084 renders button with count badge when values are selected", () => {
    const { rerender } = render(
      <MultiSelectPopover label="Status" values={[]} options={options} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();

    rerender(<MultiSelectPopover label="Status" values={["open", "closed"]} options={options} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Status 2/i })).toBeInTheDocument();
  });

  // REQ-UI-084
  it("REQ-UI-084 toggles items, selects all, and clears selections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MultiSelectPopover label="Status" values={["open"]} options={options} onChange={onChange} />);

    // Open popover
    await user.click(screen.getByRole("button", { name: /Status 1/i }));
    expect(screen.getByRole("checkbox", { name: "Open" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "In Progress" })).not.toBeChecked();

    // Toggle In Progress on
    await user.click(screen.getByRole("checkbox", { name: "In Progress" }));
    expect(onChange).toHaveBeenCalledWith(["open", "in_progress"]);

    // Toggle Open off
    onChange.mockClear();
    await user.click(screen.getByRole("checkbox", { name: "Open" }));
    expect(onChange).toHaveBeenCalledWith([]);

    // Select all
    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Select all" }));
    expect(onChange).toHaveBeenCalledWith(["open", "in_progress", "closed"]);

    // Clear
    onChange.mockClear();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("LabelsPopover", () => {
  const options = [
    { value: "ui", label: "ui" },
    { value: "backend", label: "backend" },
  ];

  // REQ-UI-085
  it("REQ-UI-085 offers Any and All match mode switch with aria-pressed", async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    const onModeChange = vi.fn();

    render(
      <LabelsPopover
        values={["ui"]}
        options={options}
        mode="any"
        onValuesChange={onValuesChange}
        onModeChange={onModeChange}
      />,
    );

    // Open labels popover
    await user.click(screen.getByRole("button", { name: /Labels 1/i }));

    // Verify Any and All buttons exist with correct aria-pressed
    const anyBtn = screen.getByRole("button", { name: "Any" });
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(anyBtn).toBeInTheDocument();
    expect(allBtn).toBeInTheDocument();
    expect(anyBtn).toHaveAttribute("aria-pressed", "true");
    expect(allBtn).toHaveAttribute("aria-pressed", "false");

    // Click All
    await user.click(allBtn);
    expect(onModeChange).toHaveBeenCalledWith("all");
  });
});

describe("MobileFiltersSheet", () => {
  const filters = parseFilters("?status=open,in_progress&priority=1");
  const options = {
    statuses: ["open", "in_progress", "closed"],
    priorities: [0, 1, 2],
    labels: ["ui", "backend"],
    types: ["bug", "task"],
    assignees: ["unassigned", "alice"],
    sprints: ["sprint-1"],
  };

  // REQ-UI-084
  it("REQ-UI-084 renders mobile sheet button and opens drawer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(<MobileFiltersSheet filters={filters} options={options} onChange={onChange} onClear={onClear} />);

    // Mobile trigger button shows total active filter count
    const trigger = screen.getByRole("button", { name: /Filters/i });
    expect(trigger).toBeInTheDocument();

    // Open sheet
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Filter Beads")).toBeInTheDocument();

    // Click Clear in sheet
    const clearBtn = screen.getByRole("button", { name: "Clear all" });
    await user.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  // REQ-UI-084
  it("REQ-UI-084 exposes aria-pressed and invokes onChange when options are toggled in sheet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(<MobileFiltersSheet filters={filters} options={options} onChange={onChange} onClear={onClear} />);

    // Open sheet
    await user.click(screen.getByRole("button", { name: /Filters/i }));

    // Status option 'open' is selected, 'closed' is not
    const openBtn = screen.getByRole("button", { name: "open" });
    const closedBtn = screen.getByRole("button", { name: "closed" });
    expect(openBtn).toHaveAttribute("aria-pressed", "true");
    expect(closedBtn).toHaveAttribute("aria-pressed", "false");

    // Click closed
    await user.click(closedBtn);
    expect(onChange).toHaveBeenCalledWith({ status: ["open", "in_progress", "closed"] });

    // Click open to toggle off
    onChange.mockClear();
    await user.click(openBtn);
    expect(onChange).toHaveBeenCalledWith({ status: ["in_progress"] });
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";
import { clearReturn, rememberSearch } from "./returnState";

beforeEach(() => clearReturn());
afterEach(cleanup);

const crumb = () => within(screen.getByRole("navigation", { name: "Breadcrumb" }));

describe("Breadcrumb", () => {
  it("REQ-UI-072 names the view and the filters and links to the remembered place", () => {
    rememberSearch("?project=a&view=board&status=open&q=fix");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    const first = crumb().getByRole("link", { name: "Beads › Board · 2 filters" });
    const href = first.getAttribute("href") ?? "";
    expect(href.startsWith("/beads?")).toBe(true);
    for (const part of ["project=a", "view=board", "status=open", "q=fix"]) expect(href).toContain(part);
    expect(crumb().getByText("a-1")).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-072 shows the parent as a link before the bead", () => {
    render(<Breadcrumb project="a" id="a-2" parent="a-1" />);
    expect(crumb().getByRole("link", { name: "a-1" })).toHaveAttribute("href", "/beads/a/a-1");
  });

  it("REQ-UI-072 without a remembered place it says Beads and goes to the project list", () => {
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=a");
  });

  it("REQ-UI-073 ignores the place of another project", () => {
    rememberSearch("?project=a&view=focus");
    render(<Breadcrumb project="b" id="b-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=b");
  });

  it("REQ-UI-072 counts Show closed as a filter and says one filter in the singular", () => {
    rememberSearch("?project=a&view=list&closed=1");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › List · 1 filter" })).toBeInTheDocument();
  });

  it("REQ-UI-072 counts assignee and sprint in active filters", () => {
    rememberSearch("?project=a&view=board&assignee=alice&sprint=1");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › Board · 2 filters" })).toBeInTheDocument();
  });

  it("REQ-UI-072 a remembered view that no longer exists shows the List", () => {
    rememberSearch("?project=a&view=tree");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › List" })).toBeInTheDocument();
  });

  it("REQ-UI-072 only the first link stays on a phone (the other items carry the hidden class)", () => {
    render(<Breadcrumb project="a" id="a-2" parent="a-1" />);
    const items = crumb().getAllByRole("listitem");
    expect(items[0]).not.toHaveClass("hidden");
    expect(items[1]).toHaveClass("hidden", "sm:flex");
    expect(items[2]).toHaveClass("hidden", "sm:flex");
  });

  it("REQ-UI-072 the project Dependencies page ends with Dependencies", () => {
    render(<Breadcrumb project="a" id="" parent={null} graph={[]} />);
    expect(crumb().getByText("Dependencies")).toHaveAttribute("aria-current", "page");
  });
});

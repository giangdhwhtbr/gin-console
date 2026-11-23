import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";
import { RETURN_KEY, clearOrigin, rememberOrigin } from "@/app/origin";

beforeEach(() => clearOrigin());
afterEach(cleanup);

const rememberSearch = (search: string) => rememberOrigin("beads", "/beads", search, new URLSearchParams(search).get("project") ?? "");
const rememberMilestone = (path: string, search: string, project = "a", label: string | null = "Checkout v2") =>
  rememberOrigin("milestone", path, search, project, label);

const crumb = () => within(screen.getByRole("navigation", { name: "Breadcrumb" }));

describe("Breadcrumb", () => {
  it("REQ-UI-139 the Beads link is not underlined and takes the identity colour on hover", () => {
    rememberSearch("?project=a&view=board");
    render(<Breadcrumb project="a" id="a-1" title="Fix login" parent={null} />);
    const link = crumb().getByRole("link", { name: /^Beads/ });
    expect(link.className).not.toContain("underline");
    expect(link.className).toContain("hover:text-identity");
  });

  it("REQ-UI-072 names the view and the filters and links to the remembered place", () => {
    rememberSearch("?project=a&view=board&status=open&q=fix");
    render(<Breadcrumb project="a" id="a-1" title="Fix login" parent={null} />);
    const first = crumb().getByRole("link", { name: "Beads › Board, 2 filters" });
    const href = first.getAttribute("href") ?? "";
    expect(href.startsWith("/beads?")).toBe(true);
    for (const part of ["project=a", "view=board", "status=open", "q=fix"]) expect(href).toContain(part);
    expect(crumb().getByText("Fix login")).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-108 counts the kind and capability filters", () => {
    rememberSearch("?project=a&kind=technical&capability=ui,beads");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › List, 2 filters" })).toBeInTheDocument();
  });

  it("REQ-UI-072 from a milestone page it names the milestone and links back to its Beads tab", () => {
    rememberMilestone("/milestones/a/m2", "?tab=beads&view=board&status=open");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Checkout v2 › Board, 1 filter" })).toHaveAttribute(
      "href",
      "/milestones/a/m2?tab=beads&view=board&status=open",
    );
  });

  it("REQ-UI-072 a milestone page without filters or a view says List", () => {
    rememberMilestone("/milestones/a/m2", "?tab=beads");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Checkout v2 › List" })).toHaveAttribute("href", "/milestones/a/m2?tab=beads");
  });

  it("REQ-UI-073 the milestone page last wins over the Beads page, and the reverse", () => {
    rememberSearch("?project=a&view=focus");
    rememberMilestone("/milestones/a/m2", "?tab=beads&view=board");
    const { unmount } = render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Checkout v2 › Board" })).toBeInTheDocument();
    unmount();
    rememberSearch("?project=a&view=focus");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › Focus" })).toBeInTheDocument();
  });

  it("REQ-UI-073 ignores the milestone place of another project", () => {
    rememberMilestone("/milestones/a/m2", "?tab=beads&view=board");
    render(<Breadcrumb project="b" id="b-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=b");
  });

  it("REQ-UI-073 a damaged remembered milestone path falls back to Beads without an error", () => {
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: "/milestones/%E0/x", search: "?tab=beads", open: {} }));
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=a");
  });

  it("REQ-UI-072 shows the parent as a link before the bead", () => {
    render(<Breadcrumb project="a" id="a-2" title="Pay" parent={{ id: "a-1", title: "Checkout" }} />);
    expect(crumb().getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/beads/a/a-1");
    expect(crumb().getAllByRole("listitem").map((li) => li.textContent?.replace("›", "").trim())).toEqual(["Beads", "Checkout", "Pay"]);
  });

  it("REQ-UI-072 shows the id of a parent whose title is not loaded, and of a bead that is not loaded", () => {
    render(<Breadcrumb project="a" id="a-2" title={null} parent={{ id: "a-1", title: null }} />);
    expect(crumb().getByRole("link", { name: "a-1" })).toHaveAttribute("href", "/beads/a/a-1");
    expect(crumb().getByText("a-2")).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-072 a long title is cut to one line with the full title and the id as its title", () => {
    const long = "A very long title ".repeat(10).trim();
    render(<Breadcrumb project="a" id="a-2" title={long} parent={{ id: "a-1", title: long }} />);
    const current = crumb().getByText(long, { selector: "[aria-current=page]" });
    expect(current).toHaveClass("truncate");
    expect(current).toHaveAttribute("title", `${long}, a-2`);
    const parent = crumb().getByRole("link", { name: long });
    expect(parent).toHaveClass("truncate");
    expect(parent).toHaveAttribute("title", `${long}, a-1`);
  });

  it("REQ-UI-072 From My Tasks it reads My Tasks and goes back to the page with its query", () => {
    rememberOrigin("my-tasks", "/my-tasks", "?project=a", "a");
    render(<Breadcrumb project="a" id="a-1" title="Fix login" parent={null} />);
    expect(crumb().getByRole("link", { name: "My Tasks" })).toHaveAttribute("href", "/my-tasks?project=a");
    expect(crumb().getByText("Fix login")).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-073 My Tasks of another project is not used", () => {
    rememberOrigin("my-tasks", "/my-tasks", "?project=a", "a");
    render(<Breadcrumb project="b" id="b-1" title="Pay" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=b");
  });

  it("REQ-UI-072 From Reports it names the page", () => {
    rememberOrigin("reports", "/reports", "?project=a&tab=quality", "a");
    render(<Breadcrumb project="a" id="a-1" title="Fix login" parent={null} />);
    expect(crumb().getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports?project=a&tab=quality");
  });

  it("REQ-UI-072 other tabs of a milestone page are named by the milestone title alone", () => {
    rememberMilestone("/milestones/a/m2", "?tab=retro");
    render(<Breadcrumb project="a" id="a-1" title="Fix login" parent={null} />);
    expect(crumb().getByRole("link", { name: "Checkout v2" })).toHaveAttribute("href", "/milestones/a/m2?tab=retro");
  });

  it("REQ-UI-072 a milestone title that is not known yet shows the milestone id", () => {
    rememberMilestone("/milestones/a/m2", "", "a", null);
    render(<Breadcrumb project="a" id="a-1" title="Fix login" parent={null} />);
    expect(crumb().getByRole("link", { name: "m2" })).toHaveAttribute("href", "/milestones/a/m2");
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
    expect(crumb().getByRole("link", { name: "Beads › List, 1 filter" })).toBeInTheDocument();
  });

  it("REQ-UI-072 counts assignee and sprint in active filters", () => {
    rememberSearch("?project=a&view=board&assignee=alice&sprint=1");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › Board, 2 filters" })).toBeInTheDocument();
  });

  it("REQ-UI-072 a remembered view that no longer exists shows the List", () => {
    rememberSearch("?project=a&view=tree");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › List" })).toBeInTheDocument();
  });

  it("REQ-UI-072 only the first link stays on a phone (the other items carry the hidden class)", () => {
    render(<Breadcrumb project="a" id="a-2" parent={{ id: "a-1", title: "Checkout" }} />);
    const items = crumb().getAllByRole("listitem");
    expect(items[0]).not.toHaveClass("hidden");
    expect(items[1]).toHaveClass("hidden", "sm:flex");
    expect(items[2]).toHaveClass("hidden", "sm:flex");
  });

  it("REQ-UI-072 no Dependencies crumb: the trail is Beads, the parent, the bead", () => {
    render(<Breadcrumb project="a" id="a-2" title="Pay" parent={{ id: "a-1", title: "Checkout" }} />);
    expect(crumb().queryByText("Dependencies")).toBeNull();
    expect(crumb().getAllByRole("listitem").map((li) => li.textContent?.replace("›", "").trim())).toEqual(["Beads", "Checkout", "Pay"]);
    expect(crumb().getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/beads/a/a-1");
  });
});

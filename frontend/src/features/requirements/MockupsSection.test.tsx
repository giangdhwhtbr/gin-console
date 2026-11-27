import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mockup } from "./api";
import { MockupFrame } from "./MockupFrame";
import { formatDate } from "@/lib/dates";
import { MockupsSection } from "./MockupsSection";
import { RequirementsFailure } from "./api";

afterEach(cleanup);

const mockup = (fields: Partial<Mockup> = {}): Mockup => ({
  capability: "ui",
  date: "2026-11-22",
  confirmed: "2026-11-23T10:00:00",
  confirmed_by: "ba",
  description: "The **home** screen",
  html: ["mockup/index.html"],
  images: [],
  requirements: ["REQ-UI-001"],
  grant: null,
  ...fields,
});
function show(mockups: Mockup[], url = "/requirements/mockups?project=a", legacy: boolean | null = false) {
  window.history.replaceState(null, "", url);
  render(<MockupsSection project="a" legacy={legacy} list={{ status: "ok", data: { mockups } }} retry={() => undefined} />);
}

describe("MockupsSection", () => {
  // REQ-REQUIREMENTS-011
  it("REQ-REQUIREMENTS-011 isolates a mockup", () => {
    render(<MockupFrame title="ui 2026-11-22" src="/api/requirements/mockups/a/files/ui/2026-11-22/index.html" />);
    expect(screen.getByTitle("ui 2026-11-22")).toHaveAttribute("sandbox", "allow-scripts");
  });

  it("REQ-REQUIREMENTS-018 lists folders by capability with date, confirmation, person and requirement links", () => {
    show([mockup(), mockup({ capability: "api", date: "2026-10-01", requirements: [] })]);
    expect(screen.getByRole("heading", { name: "ui" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "api" })).toBeTruthy();
    const folder = screen.getByRole("link", { name: `ui ${formatDate("2026-11-22")}` });
    expect(folder).toHaveAttribute("href", "/requirements/mockups?project=a&mockup=ui%2F2026-11-22");
    const item = folder.closest("li");
    if (item === null) throw new Error("no item");
    expect(within(item).getByText(/ba/)).toBeTruthy();
    expect(within(item).getByText(/23 Nov/)).toBeTruthy();
    expect(within(item).getByRole("link", { name: "REQ-UI-001" })).toHaveAttribute("href", "/requirements/matrix?project=a&req=REQ-UI-001");
  });

  it("REQ-UI-131 shows the mockup date in the one date format, its name unique per capability and date", () => {
    show([mockup({ date: "2020-11-22" }), mockup({ date: "2021-11-22" }), mockup({ capability: "api", date: "2020-11-22" })]);
    expect(screen.getByRole("link", { name: "ui 22 Nov 2020" })).toHaveAttribute("href", "/requirements/mockups?project=a&mockup=ui%2F2020-11-22");
    expect(screen.getByRole("link", { name: "ui 22 Nov 2021" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "api 22 Nov 2020" })).toBeTruthy();
    expect(screen.queryByText("2020-11-22")).toBeNull();
  });

  it("REQ-UI-131 the selected mockup's heading, region and frame write the date, its links keep the key", () => {
    show([mockup({ date: "2020-11-22" })], "/requirements/mockups?project=a&mockup=ui/2020-11-22");
    expect(within(screen.getByRole("region", { name: "ui 22 Nov 2020" })).getByRole("heading", { name: "ui 22 Nov 2020" })).toBeTruthy();
    expect(screen.getByTitle("ui 22 Nov 2020 mockup/index.html")).toHaveAttribute("src", "/api/requirements/mockups/a/files/ui/2020-11-22/mockup/index.html");
  });

  it("REQ-UI-131 a key that is no folder key is said as it is", () => {
    show([mockup()], "/requirements/mockups?project=a&mockup=ui/latest");
    expect(screen.getByText("Mockup ui/latest was not found")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 while the layout is unknown, empty shows loading and a filled list shows at once", () => {
    show([], "/requirements/mockups?project=a", null);
    expect(screen.getByText("Loading mockups")).toBeTruthy();
    expect(screen.queryByText("This project has no confirmed mockups yet.")).toBeNull();
    cleanup();
    show([mockup()], "/requirements/mockups?project=a", null);
    expect(screen.getByRole("heading", { name: "ui" })).toBeTruthy();
    expect(screen.queryByText("Loading mockups")).toBeNull();
  });

  it("REQ-REQUIREMENTS-018 show a mockup: description and the frame", () => {
    show([mockup()], "/requirements/mockups?project=a&mockup=ui/2026-11-22");
    expect(screen.getByText("home")).toBeTruthy();
    const frame = screen.getByTitle(`ui ${formatDate("2026-11-22")} mockup/index.html`);
    expect(frame).toHaveAttribute("sandbox", "allow-scripts");
    expect(frame).toHaveAttribute("src", "/api/requirements/mockups/a/files/ui/2026-11-22/mockup/index.html");
    const open = screen.getByRole("link", { name: "Open in a new tab" });
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noreferrer");
    expect(open).toHaveAttribute("href", "/api/requirements/mockups/a/files/ui/2026-11-22/mockup/index.html");
  });

  it("REQ-REQUIREMENTS-018 a control per HTML file switches the frame", async () => {
    show([mockup({ html: ["a.html", "b.html"] })], "/requirements/mockups?project=a&mockup=ui/2026-11-22");
    expect(screen.getByRole("button", { name: "a.html" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "b.html" }));
    expect(screen.getByRole("button", { name: "b.html" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTitle(`ui ${formatDate("2026-11-22")} b.html`)).toBeTruthy();
    expect(screen.queryByTitle(`ui ${formatDate("2026-11-22")} a.html`)).toBeNull();
  });

  it("REQ-REQUIREMENTS-018 images only: both images, no frame", () => {
    show([mockup({ html: [], images: ["one.png", "two.png"] })], "/requirements/mockups?project=a&mockup=ui/2026-11-22");
    expect(screen.getByRole("img", { name: "one.png" })).toHaveAttribute("src", "/api/requirements/mockups/a/files/ui/2026-11-22/one.png");
    expect(screen.getByRole("img", { name: "two.png" })).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("REQ-REQUIREMENTS-018 nothing selected shows no frame", () => {
    show([mockup()]);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("REQ-REQUIREMENTS-019 empty", () => {
    show([]);
    expect(screen.getByText("This project has no confirmed mockups yet.")).toBeTruthy();
  });

  it("REQ-REQUIREMENTS-019 failure shows the error and Retry works", async () => {
    const retry = vi.fn();
    window.history.replaceState(null, "", "/requirements/mockups?project=a");
    render(<MockupsSection project="a" legacy={false} list={{ status: "error", error: new RequirementsFailure("boom", 500) }} retry={retry} />);
    expect(screen.getByText("boom")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("REQ-REQUIREMENTS-019 legacy and empty says the layout has no requirement ids", () => {
    show([], "/requirements/mockups?project=a", true);
    expect(screen.getByText("This project uses the legacy layout, which has no requirement ids.")).toBeTruthy();
    expect(screen.queryByText("This project has no confirmed mockups yet.")).toBeNull();
  });

  it("REQ-REQUIREMENTS-018 legacy with mockups still lists them", () => {
    show([mockup()], "/requirements/mockups?project=a", true);
    expect(screen.getByRole("link", { name: `ui ${formatDate("2026-11-22")}` })).toBeTruthy();
    expect(screen.queryByText(/legacy layout/)).toBeNull();
  });

  it("REQ-REQUIREMENTS-018 an unmatched mockup key says it was not found and keeps the list", () => {
    show([mockup()], "/requirements/mockups?project=a&mockup=ui/2000-01-01");
    expect(screen.getByText("Mockup ui 1 Jan 2000 was not found")).toBeTruthy();
    expect(screen.getByRole("link", { name: `ui ${formatDate("2026-11-22")}` })).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("REQ-REQUIREMENTS-018 the selected folder is aria-current page and its heading takes focus", () => {
    show([mockup(), mockup({ date: "2026-11-01" })], "/requirements/mockups?project=a&mockup=ui/2026-11-22");
    expect(screen.getByRole("link", { name: `ui ${formatDate("2026-11-22")}` })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: `ui ${formatDate("2026-11-01")}` })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: `ui ${formatDate("2026-11-22")}` })).toHaveFocus();
  });

  it("REQ-REQUIREMENTS-009 each mockup's frame uses its own grant", () => {
    const two = [mockup({ grant: "g1" }), mockup({ capability: "api", grant: "g2" })];
    show(two, "/requirements/mockups?project=a&mockup=ui/2026-11-22");
    expect(screen.getByTitle(`ui ${formatDate("2026-11-22")} mockup/index.html`)).toHaveAttribute("src", "/api/requirements/mockups/a/g/g1/files/ui/2026-11-22/mockup/index.html");
    cleanup();
    show(two, "/requirements/mockups?project=a&mockup=api/2026-11-22");
    expect(screen.getByTitle(`api ${formatDate("2026-11-22")} mockup/index.html`)).toHaveAttribute("src", "/api/requirements/mockups/a/g/g2/files/api/2026-11-22/mockup/index.html");
  });
});

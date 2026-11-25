import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { Mockup } from "./api";
import { MockupFrame } from "./MockupFrame";
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
  ...fields,
});
function show(mockups: Mockup[], url = "/requirements/mockups?project=a") {
  window.history.replaceState(null, "", url);
  render(<MockupsSection project="a" list={{ status: "ok", data: { mockups } }} retry={() => undefined} />);
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
    const folder = screen.getByRole("link", { name: /22 Nov/ });
    expect(folder).toHaveAttribute("href", "/requirements/mockups?project=a&mockup=ui%2F2026-11-22");
    const item = folder.closest("li");
    if (item === null) throw new Error("no item");
    expect(within(item).getByText(/ba/)).toBeTruthy();
    expect(within(item).getByText(/23 Nov/)).toBeTruthy();
    expect(within(item).getByRole("link", { name: "REQ-UI-001" })).toHaveAttribute("href", "/requirements/matrix?project=a&req=REQ-UI-001");
  });

  it("REQ-REQUIREMENTS-018 show a mockup: description and the frame", () => {
    show([mockup()], "/requirements/mockups?project=a&mockup=ui/2026-11-22");
    expect(screen.getByText("home")).toBeTruthy();
    const frame = screen.getByTitle("ui 2026-11-22 mockup/index.html");
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
    expect(screen.getByTitle("ui 2026-11-22 b.html")).toBeTruthy();
    expect(screen.queryByTitle("ui 2026-11-22 a.html")).toBeNull();
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

  it("REQ-REQUIREMENTS-019 failure shows the error", () => {
    window.history.replaceState(null, "", "/requirements/mockups?project=a");
    render(<MockupsSection project="a" list={{ status: "error", error: new RequirementsFailure("boom", 500) }} retry={() => undefined} />);
    expect(screen.getByText("boom")).toBeTruthy();
  });
});

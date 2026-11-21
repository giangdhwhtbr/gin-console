import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundPage } from "./NotFoundPage";
import { forgetConfiguredProjects, rememberProject, setFavorite } from "./project";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const row = (name: string) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setFavorite(null);
  forgetConfiguredProjects();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NotFoundPage", () => {
  it("REQ-UI-125 names the address and links to Projects and to Beads of the current project", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([row("alpha"), row("beta")]))));
    rememberProject("beta");
    render(<NotFoundPage path="/nope" />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("/nope")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/");
    expect(await screen.findByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=beta");
  });

  it("REQ-UI-125 links to bare /beads when no project is configured", () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<NotFoundPage path="/nope" />);
    expect(screen.getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads");
  });

  it("REQ-UI-063 sets the title", () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<NotFoundPage path="/nope" />);
    expect(document.title).toBe("Page not found · gin-console");
  });
});

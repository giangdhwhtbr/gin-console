import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetConfiguredProjects, rememberProject, setFavorite, FAVORITE_KEY, TAB_PROJECT_KEY } from "./project";
import { ProjectSwitcher, type SwitcherVariant } from "./ProjectSwitcher";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const entry = (name: string) => ({ name, path: `/${name}`, exists: true, beads: null, pull: null });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setFavorite(null);
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([entry("alpha"), entry("beta"), entry("gamma")]))));
  forgetConfiguredProjects();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

const open = (variant: SwitcherVariant, url = "/beads?project=beta&view=list") => {
  window.history.replaceState(null, "", url);
  render(<ProjectSwitcher variant={variant} />);
};
const trigger = async (name: string | RegExp) => {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
};

describe("ProjectSwitcher", () => {
  it("REQ-UI-123 the sidebar variant names the current project and counts the projects", async () => {
    open("sidebar");
    const button = await trigger(/beta/);
    expect(button).toHaveTextContent("beta");
    expect(button).toHaveTextContent("3 projects");
  });

  it.each<[SwitcherVariant, string]>([["sidebar", "w-full"], ["bar", "min-w-0"]])(
    "REQ-UI-061 a 60-character project name is cut short in the switcher (%s)",
    async (variant, bound) => {
      const long = "p".repeat(60);
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([entry(long)]))));
      open(variant, `/beads?project=${long}`);
      const button = await trigger(new RegExp(long));
      const name = within(button).getByTitle(long); // REQ-UI-107: the full name is the title
      expect(name).toHaveClass("truncate");
      expect(name.parentElement).toHaveClass("min-w-0");
      expect(button).toHaveClass(bound); // the trigger stays within its container
    },
  );

  it("REQ-UI-123 the rail variant is a capital letter button named Project: <name>", async () => {
    open("rail");
    const button = await trigger("Project: beta");
    expect(button).toHaveTextContent("B");
  });

  it("REQ-UI-123 the bar variant shows the project name", async () => {
    open("bar");
    expect(await trigger("beta")).toBeEnabled();
  });

  it("REQ-UI-123 falls back to the first project when the URL names none", async () => {
    open("bar", "/my-tasks");
    expect(await trigger("alpha")).toBeEnabled();
  });

  it("REQ-UI-123 lists the favorite first with a pressed star", async () => {
    setFavorite("gamma");
    open("bar");
    await userEvent.click(await trigger("beta"));
    const items = within(await screen.findByRole("list", { name: "Projects" })).getAllByRole("listitem");
    expect(items.map((item) => within(item).getAllByRole("button")[0].textContent)).toEqual(["gamma", "alpha", "beta"]);
    expect(screen.getByRole("button", { name: "Remove gamma as favorite" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Make alpha the favorite" })).toHaveAttribute("aria-pressed", "false");
  });

  it("REQ-UI-123 the star makes a favorite and removes it again", async () => {
    open("bar");
    await userEvent.click(await trigger("beta"));
    await userEvent.click(await screen.findByRole("button", { name: "Make alpha the favorite" }));
    expect(window.localStorage.getItem(FAVORITE_KEY)).toBe("alpha");
    expect(screen.getByRole("button", { name: "Remove alpha as favorite" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Remove alpha as favorite" }));
    expect(window.localStorage.getItem(FAVORITE_KEY)).toBeNull();
  });

  it("REQ-UI-123 REQ-UI-124 choosing a project remembers it and keeps the page and view", async () => {
    open("bar");
    await userEvent.click(await trigger("beta"));
    await userEvent.click(await screen.findByRole("button", { name: "gamma" }));
    expect(window.sessionStorage.getItem(TAB_PROJECT_KEY)).toBe("gamma");
    expect(window.location.pathname + window.location.search).toBe("/beads?project=gamma&view=list");
    expect(await trigger("gamma")).toBeEnabled();
  });

  it("REQ-UI-123 stays disabled with no configured project", async () => {
    rememberProject("none");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    forgetConfiguredProjects();
    open("bar");
    expect(await screen.findByRole("button", { name: "No project" })).toBeDisabled();
  });
});

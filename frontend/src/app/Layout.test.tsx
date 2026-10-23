import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Layout } from "./Layout";

afterEach(cleanup);

const open = (path: string) => {
  window.history.replaceState(null, "", path);
  render(<Layout>page</Layout>);
};
const nav = () => screen.getByRole("navigation", { name: "Main" });
const marked = () =>
  within(nav())
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page")
    .map((link) => link.textContent);

describe("Layout", () => {
  it("REQ-UI-055 has one Main navigation with the four links", () => {
    open("/");
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
    expect(within(nav()).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Projects", "/"],
      ["Beads", "/beads"],
      ["Sessions", "/sessions"],
      ["Quota", "/quota"],
    ]);
  });

  it.each([
    ["/", ["Projects"]],
    ["/beads", ["Beads"]],
    ["/beads/alpha/a-1", ["Beads"]],
    ["/sessions", ["Sessions"]],
    ["/sessions/alpha/11111111-1111-4111-8111-111111111111", ["Sessions"]],
    ["/quota", ["Quota"]],
    ["/nowhere", []],
    ["/beadsx", []],
    ["/sessionsx", []],
  ])("REQ-UI-057 %s marks %j", (path, expected) => {
    open(path);
    expect(marked()).toEqual(expected);
  });

  it("REQ-UI-057 follows a click", async () => {
    open("/");
    await userEvent.click(within(nav()).getByRole("link", { name: "Quota" }));
    expect(marked()).toEqual(["Quota"]);
  });

  it("REQ-UI-062 offers the theme control", () => {
    open("/");
    expect(screen.getAllByRole("button", { name: /Switch to (dark|light) theme/ }).length).toBeGreaterThan(0);
  });
});

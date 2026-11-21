import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json, stubBeads } from "./beadFixtures";
import { OldGraphLink } from "./OldGraphLink";

const epic = (id: string, extra = {}) => bead(id, { issue_type: "epic", ...extra });
const where = () => window.location.pathname + window.location.search;

function open(id: string | null, beads: BeadSummary[], select = "") {
  window.history.replaceState(null, "", "/start");
  stubBeads(() => json(beads));
  render(<OldGraphLink project="p" id={id} select={select} />);
}
const lands = (target: string) => waitFor(() => expect(where()).toBe(target));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OldGraphLink", () => {
  it("REQ-UI-075 Project: the old project link shows the Graph view of the project", async () => {
    open(null, [epic("e-1")]);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await lands("/beads?project=p&view=graph");
  });

  it("REQ-UI-075 Epic: shows the page of the epic with tab=graph", async () => {
    open("e-1", [epic("e-1"), bead("t", { parent: "e-1" })]);
    await lands("/beads/p/e-1?tab=graph");
  });

  it("REQ-UI-075 Bead with children: the Graph view with that scope", async () => {
    open("t-1", [bead("t-1"), bead("c", { parent: "t-1" })]);
    await lands("/beads?project=p&view=graph&scope=t-1");
  });

  it("REQ-UI-075 Bead without children: the parent's Graph view with the bead selected", async () => {
    open("b", [epic("e-1"), bead("b", { parent: "e-1" })]);
    await lands("/beads?project=p&view=graph&scope=e-1&select=b");
  });

  it("REQ-UI-075 Bead without children or parent: the project's Graph view with the bead selected", async () => {
    open("z", [bead("z")]);
    await lands("/beads?project=p&view=graph&select=z");
  });

  it("REQ-UI-075 Selection kept: the epic page keeps select, and so does the Graph view", async () => {
    open("e-1", [epic("e-1"), bead("b", { parent: "e-1" })], "b");
    await lands("/beads/p/e-1?tab=graph&select=b");
    cleanup();
    open(null, [epic("e-1")], "e-1");
    await lands("/beads?project=p&view=graph&select=e-1");
  });

  it("REQ-UI-075 Unknown bead: Bead not found with a link to the Beads page", async () => {
    open("nope", [bead("t")]);
    expect(await screen.findByText("Bead not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=p");
    expect(where()).toBe("/start");
  });

  it("REQ-UI-075 No extra history entry: the old link is replaced", async () => {
    const before = window.history.length;
    open("e-1", [epic("e-1")]);
    await lands("/beads/p/e-1?tab=graph");
    expect(window.history.length).toBe(before);
  });

  it("REQ-UI-075 a load error is shown with Retry and the page stays", async () => {
    window.history.replaceState(null, "", "/start");
    stubBeads(() => json({ error: "boom" }, 500));
    render(<OldGraphLink project="p" id="e-1" select="" />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(where()).toBe("/start");
  });
});

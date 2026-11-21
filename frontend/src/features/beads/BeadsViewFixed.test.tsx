import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsView } from "./BeadsView";
import { parseFilters } from "./filters";
import { E12, e12 } from "./laneFixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const e9 = bead("e-9", { issue_type: "epic", parent: "m1" });
const kid = bead("e-9.1", { parent: "e-9" });

describe("BeadsView fixed", () => {
  it("REQ-UI-119 fixed: the view and the scope are forced, with no view tabs, milestone filter or scope trail, and the search stays", async () => {
    stubBeads(() => json([e9, kid]));
    render(<BeadsView project="alpha" filters={parseFilters("?view=list&scope=zzz&milestone=m2")} fixed={{ view: "graph", scope: "e-9" }} onChange={vi.fn()} />);
    expect(await screen.findByRole("button", { name: /^e-9\.1/ })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "View" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Graph scope" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Milestone/ })).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeInTheDocument();
  });

  it("REQ-UI-119 fixed: closed beads are loaded so the lanes are found", async () => {
    const fetchMock = stubBeads(() => json(e12));
    render(<BeadsView project="alpha" filters={parseFilters("")} fixed={{ view: "lanes", scope: E12 }} onChange={vi.fn()} />);
    expect(await screen.findByTestId("lanes-canvas")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => typeof url === "string" && url.includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-119 fixed: an epic without children says No tracks instead of falling back to the project", async () => {
    stubBeads(() => json([e9, bead("other")]));
    render(<BeadsView project="alpha" filters={parseFilters("")} fixed={{ view: "graph", scope: "e-9" }} onChange={vi.fn()} />);
    expect(await screen.findByText("No tracks")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^other/ })).toBeNull();
  });

  it("REQ-UI-106 without fixed the Beads page keeps the view tabs and the scope trail", async () => {
    stubBeads(() => json([e9, kid]));
    render(<BeadsView project="alpha" filters={parseFilters("?view=graph&scope=e-9")} onChange={vi.fn()} />);
    expect(await screen.findByRole("navigation", { name: "View" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Graph scope" })).toBeInTheDocument();
  });
});

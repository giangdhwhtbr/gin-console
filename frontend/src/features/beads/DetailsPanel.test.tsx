import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead, json } from "./beadFixtures";
import { DetailsPanel } from "./DetailsPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stub = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/comments")) return Promise.resolve(json([]));
      return Promise.resolve(
        json({
          ...bead("t-1", { title: "Task One" }),
          description: null,
          design: null,
          notes: null,
          acceptance_criteria: null,
          close_reason: null,
          dependencies: [],
          dependents: [],
          children: [],
          bugs: [],
        }),
      );
    }),
  );

describe("DetailsPanel", () => {
  it("REQ-UI-045 landmark, close button, note and embedded bead", async () => {
    stub();
    const onClose = vi.fn();
    render(<DetailsPanel project="alpha" id="t-1" note="Not in the current list" onClose={onClose} />);

    expect(screen.getByRole("complementary", { name: "Bead details" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Not in the current list")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Task One" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("REQ-UI-045 no note when none is given", () => {
    stub();
    render(<DetailsPanel project="alpha" id="t-1" onClose={() => {}} />);
    expect(screen.queryByText("Not in the current list")).toBeNull();
  });
});

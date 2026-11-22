import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "../HintProvider";
import { Hint } from "./tooltip";

afterEach(cleanup);

describe("Hint", () => {
  it("REQ-UI-132 focusing the trigger shows the text and Escape hides it", async () => {
    const user = userEvent.setup();
    render(
      <HintProvider>
        <Hint text="Blocked: a rule">
          <span tabIndex={0}>blocked 4</span>
        </Hint>
      </HintProvider>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Blocked: a rule");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("REQ-UI-132 blur hides the tooltip", async () => {
    const user = userEvent.setup();
    render(
      <HintProvider>
        <Hint text="Focus text.">
          <span tabIndex={0}>mark</span>
        </Hint>
        <button type="button">other</button>
      </HintProvider>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("REQ-UI-132 hovering the trigger shows the text within 500 ms and leaving hides it", async () => {
    const user = userEvent.setup();
    render(
      <HintProvider>
        <Hint text="One sentence.">
          <span>mark</span>
        </Hint>
      </HintProvider>,
    );
    const started = performance.now();
    await user.hover(screen.getByText("mark"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("One sentence.");
    expect(performance.now() - started).toBeLessThan(500);
    await user.unhover(screen.getByText("mark"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("REQ-UI-132 aria-describedby points to an element holding the text, open or not, and there is no title", () => {
    render(
      <HintProvider>
        <Hint text="Described by id.">
          <span>mark</span>
        </Hint>
      </HintProvider>,
    );
    const id = screen.getByText("mark").getAttribute("aria-describedby");
    expect(id).not.toBeNull();
    expect(document.getElementById(id ?? "")).toHaveTextContent("Described by id.");
    expect(screen.getByText("mark")).not.toHaveAttribute("title");
  });

  it("REQ-UI-132 the same text is described once, and the description goes when its last mark goes", () => {
    const marks = (n: number) => (
      <HintProvider>
        {Array.from({ length: n }, (_, i) => (
          <Hint key={i} text="Same.">
            <span>mark</span>
          </Hint>
        ))}
      </HintProvider>
    );
    const { rerender } = render(marks(3));
    expect(document.querySelectorAll("[id^='hint-']")).toHaveLength(1);
    rerender(marks(0));
    expect(document.querySelectorAll("[id^='hint-']")).toHaveLength(0);
  });

  it("REQ-UI-132 without a provider the child renders as it is", () => {
    render(
      <Hint text="No host.">
        <span>mark</span>
      </Hint>,
    );
    expect(screen.getByText("mark")).not.toHaveAttribute("aria-describedby");
  });
});

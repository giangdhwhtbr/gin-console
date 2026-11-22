import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Hint } from "./tooltip";

afterEach(cleanup);

describe("Hint", () => {
  it("REQ-UI-132 focusing the trigger shows the text and Escape hides it", async () => {
    const user = userEvent.setup();
    render(
      <Hint text="Blocked: a rule" delay={0}>
        <span tabIndex={0}>blocked 4</span>
      </Hint>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Blocked: a rule");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("REQ-UI-132 hovering the trigger shows the text and leaving hides it", async () => {
    const user = userEvent.setup();
    render(
      <Hint text="One sentence." delay={0}>
        <span>mark</span>
      </Hint>,
    );
    await user.hover(screen.getByText("mark"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("One sentence.");
    await user.unhover(screen.getByText("mark"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("REQ-UI-132 aria-describedby points to an element holding the text, open or not", () => {
    render(
      <Hint text="Described by id.">
        <span>mark</span>
      </Hint>,
    );
    const id = screen.getByText("mark").getAttribute("aria-describedby");
    expect(id).not.toBeNull();
    expect(document.getElementById(id ?? "")).toHaveTextContent("Described by id.");
    expect(screen.getByText("mark")).not.toHaveAttribute("title");
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { CountBadge } from "./CountBadge";

afterEach(cleanup);

describe("CountBadge", () => {
  it("REQ-UI-066 draws nothing for 0", () => {
    const { container } = render(<CountBadge kind="comments" count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-UI-066 labels the comment count", () => {
    render(<CountBadge kind="comments" count={3} />);
    expect(screen.getByRole("img", { name: "3 comments" })).toHaveTextContent("3");
  });

  it("REQ-UI-066 uses the singular and the dependency noun", () => {
    render(
      <>
        <CountBadge kind="comments" count={1} />
        <CountBadge kind="dependencies" count={2} />
      </>,
    );
    expect(screen.getByRole("img", { name: "1 comment" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 dependencies" })).toBeInTheDocument();
  });

  it("REQ-UI-066 labels the image count with the singular and the plural", () => {
    const { unmount } = render(<CountBadge kind="images" count={1} />);
    expect(screen.getByRole("img", { name: "1 image" })).toBeInTheDocument();
    unmount();
    render(<CountBadge kind="images" count={2} />);
    expect(screen.getByRole("img", { name: "2 images" })).toHaveTextContent("2");
  });

  it("REQ-UI-066 draws nothing for an image count of 0", () => {
    const { container } = render(<CountBadge kind="images" count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-UI-132 Image indicator: resting the pointer on it shows what the images are", async () => {
    const user = userEvent.setup();
    render(<HintProvider><CountBadge kind="images" count={2} /></HintProvider>);
    const badge = screen.getByRole("img", { name: "2 images" });
    expect(badge).not.toHaveAttribute("title");
    await user.hover(badge);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(DEFINITIONS.images);
  });

  it("REQ-UI-140 both indicators are an icon and a number, without a background", () => {
    render(
      <>
        <CountBadge kind="comments" count={2} />
        <CountBadge kind="dependencies" count={2} />
      </>,
    );
    for (const name of ["2 comments", "2 dependencies"]) {
      const indicator = screen.getByRole("img", { name });
      expect(indicator).toHaveClass("text-muted-foreground");
      expect(indicator.className).not.toMatch(/\bbg-|rounded/);
    }
  });

  it("REQ-UI-132 the indicator has no title; resting the pointer on it shows what the dependencies are", async () => {
    const user = userEvent.setup();
    render(<HintProvider><CountBadge kind="dependencies" count={2} /></HintProvider>);
    const badge = screen.getByRole("img", { name: "2 dependencies" });
    expect(badge).not.toHaveAttribute("title");
    await user.hover(badge);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(DEFINITIONS.dependencies);
  });
});

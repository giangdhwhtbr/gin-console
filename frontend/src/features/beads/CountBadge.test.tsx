import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("REQ-UI-066 makes the comment indicator the stronger one", () => {
    render(
      <>
        <CountBadge kind="comments" count={2} />
        <CountBadge kind="dependencies" count={2} />
      </>,
    );
    expect(screen.getByRole("img", { name: "2 comments" })).toHaveClass("font-semibold");
    expect(screen.getByRole("img", { name: "2 dependencies" })).not.toHaveClass("font-semibold");
  });
});

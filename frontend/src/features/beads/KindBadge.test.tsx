import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KindBadge } from "./KindBadge";

afterEach(cleanup);

describe("KindBadge", () => {
  it("REQ-UI-109 shows Technical and Parity", () => {
    render(
      <>
        <KindBadge kind="technical" />
        <KindBadge kind="parity" />
      </>,
    );
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Parity")).toBeInTheDocument();
  });

  it("REQ-UI-109 shows nothing for a capability epic or a bead without kind", () => {
    const { container } = render(
      <>
        <KindBadge kind="capability" />
        <KindBadge kind={null} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

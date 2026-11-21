import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UnknownProject } from "./UnknownProject";

afterEach(cleanup);

describe("UnknownProject", () => {
  it("REQ-UI-126 names the project and links every configured project", () => {
    render(<UnknownProject name="zzz" names={["a", "b"]} hrefOf={(p) => `/beads?project=${p}`} />);
    expect(screen.getByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "a" })).toHaveAttribute("href", "/beads?project=a");
    expect(screen.getByRole("link", { name: "b" })).toHaveAttribute("href", "/beads?project=b");
  });

  it("REQ-UI-126 shows no links when no project is configured", () => {
    render(<UnknownProject name="zzz" names={[]} hrefOf={(p) => p} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePageTitle } from "./usePageTitle";

function Page({ name, project }: { name: string | null; project?: string | null }) {
  usePageTitle(name, project);
  return null;
}

afterEach(() => {
  cleanup();
  document.title = "gin-console";
});

describe("usePageTitle", () => {
  it("REQ-UI-063 names the page and ends with gin-console", () => {
    render(<Page name="Projects" />);
    expect(document.title).toBe("Projects · gin-console");
  });

  it("REQ-UI-063 puts the project between the name and gin-console", () => {
    render(<Page name="Beads" project="example" />);
    expect(document.title).toBe("Beads · example · gin-console");
  });

  it("REQ-UI-063 leaves out an empty project", () => {
    render(<Page name="My work" project="" />);
    expect(document.title).toBe("My work · gin-console");
  });

  it("REQ-UI-063 is gin-console while the name loads", () => {
    document.title = "other";
    render(<Page name={null} project="example" />);
    expect(document.title).toBe("gin-console");
  });

  it("REQ-UI-063 follows the name once it loads and restores gin-console on unmount", () => {
    const { rerender, unmount } = render(<Page name={null} />);
    rerender(<Page name="Team checkout" project="example" />);
    expect(document.title).toBe("Team checkout · example · gin-console");
    unmount();
    expect(document.title).toBe("gin-console");
  });
});

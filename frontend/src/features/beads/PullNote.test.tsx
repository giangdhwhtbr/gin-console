import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PullNote } from "./PullNote";

afterEach(cleanup);

describe("PullNote", () => {
  it("REQ-BEADS-034 an attachments failure names the project, the error, the git fetch command and the path", () => {
    render(<PullNote failures={[{ project: "alpha", path: "/home/gin/alpha", error: "no network", kind: "attachments" }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Fetching attachments of alpha failed: no network. Run git fetch origin +refs/gin/attachments:refs/gin-console/attachments in /home/gin/alpha.",
    );
  });

  it("REQ-BEADS-034 a pull and an attachments failure of one project are two notes", () => {
    render(
      <PullNote
        failures={[
          { project: "alpha", path: "/p", error: "e1" },
          { project: "alpha", path: "/p", error: "e2", kind: "attachments" },
        ]}
      />,
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByText(/Pulling Beads of alpha failed: e1/)).toBeInTheDocument();
  });
});

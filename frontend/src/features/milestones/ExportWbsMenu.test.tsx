import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ExportWbsMenu } from "./ExportWbsMenu";

afterEach(cleanup);

const links = async () => (await screen.findAllByRole("menuitem")).map((a) => [a.textContent, a.getAttribute("href"), a.hasAttribute("download")]);

describe("ExportWbsMenu", () => {
  it("REQ-MILESTONE-UI-032 opens on click with three download links for one milestone", async () => {
    render(<ExportWbsMenu project="alpha" milestone="m1" />);
    await userEvent.click(screen.getByRole("button", { name: "Export WBS" }));
    expect(await links()).toEqual([
      ["Excel (.xlsx)", "/api/milestones/alpha/wbs?milestone=m1&format=xlsx", true],
      ["CSV for Jira (.csv)", "/api/milestones/alpha/wbs?milestone=m1&format=csv", true],
      ["Markdown (.md)", "/api/milestones/alpha/wbs?milestone=m1&format=md", true],
    ]);
  });

  it("REQ-MILESTONE-UI-032 without a milestone the links cover the project and encode the names", async () => {
    render(<ExportWbsMenu project="a b" />);
    await userEvent.click(screen.getByRole("button", { name: "Export WBS" }));
    expect((await links())[1]).toEqual(["CSV for Jira (.csv)", "/api/milestones/a%20b/wbs?format=csv", true]);
  });

  it("REQ-MILESTONE-UI-032 encodes the milestone", async () => {
    render(<ExportWbsMenu project="alpha" milestone="m 1" />);
    await userEvent.click(screen.getByRole("button", { name: "Export WBS" }));
    expect((await links())[0][1]).toBe("/api/milestones/alpha/wbs?milestone=m%201&format=xlsx");
  });
});

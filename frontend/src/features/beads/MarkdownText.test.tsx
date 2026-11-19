import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownText } from "./MarkdownText";

afterEach(cleanup);

describe("MarkdownText", () => {
  it("REQ-UI-110 the text shown while the Markdown chunk loads breaks long URLs and does not hang trailing spaces", () => {
    render(<MarkdownText text="PR opened: https://github.com/Qwikfoneoffice/QwikFone_Office_Backend/pull/263 (b)" />);
    const p = screen.getByText(/PR opened/);
    expect(p.className).toContain("[overflow-wrap:anywhere]");
    expect(p.className).toContain("whitespace-break-spaces");
  });
});

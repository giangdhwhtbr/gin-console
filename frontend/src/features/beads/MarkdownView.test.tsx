import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownView, safeUrl } from "./MarkdownView";

afterEach(cleanup);

describe("MarkdownView", () => {
  it("REQ-UI-028 markdown description: heading, bold list item, code block", () => {
    const { container } = render(<MarkdownView text={"## Change\n1. Format **dates**\n\n```\nuv run pytest\n```"} />);
    expect(screen.getByRole("heading", { name: "Change" })).toBeInTheDocument();
    expect(container.querySelector("ol > li > strong")?.textContent).toBe("dates");
    expect(container.querySelector("pre > code")?.textContent).toBe("uv run pytest\n");
  });

  it("REQ-UI-028 raw HTML stays text", () => {
    const raw = "<script>x</script> and <img src=x onerror=alert(1)>";
    const { container } = render(<MarkdownView text={raw} />);
    expect(container).toHaveTextContent(raw);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("REQ-UI-028 unsafe link: javascript and relative are text, https opens in a new tab", () => {
    render(<MarkdownView text={"[run](javascript:alert(1)) [rel](docs/a.md) [docs](https://example.com) [mail](mailto:a@b.c)"} />);
    expect(screen.queryByRole("link", { name: "run" })).toBeNull();
    expect(screen.queryByRole("link", { name: "rel" })).toBeNull();
    const docs = screen.getByRole("link", { name: "docs" });
    expect(docs).toHaveAttribute("href", "https://example.com");
    expect(docs).toHaveAttribute("target", "_blank");
    expect(docs).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByRole("link", { name: "mail" })).toHaveAttribute("href", "mailto:a@b.c");
  });

  it("REQ-UI-038 task list item is a disabled checkbox", () => {
    render(<MarkdownView text={"- [ ] Local time"} />);
    const box = screen.getByRole("checkbox");
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
  });

  it("REQ-UI-028 single line breaks are kept", () => {
    const { container } = render(<MarkdownView text={"first line\nsecond line"} />);
    expect(container.querySelector("br")).not.toBeNull();
  });

  it("safeUrl keeps http, https and mailto only", () => {
    expect(["https://a", "http://a", "mailto:a@b", "javascript:x", "/beads", "docs/a.md"].map(safeUrl)).toEqual([
      "https://a",
      "http://a",
      "mailto:a@b",
      "",
      "",
      "",
    ]);
  });
});

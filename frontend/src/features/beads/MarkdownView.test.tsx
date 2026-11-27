import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { imageAddress, type BeadImage } from "./api";
import { MarkdownView, safeUrl, type ImageResolver } from "./MarkdownView";
import { findImage } from "./images/match";

const beadImages: BeadImage[] = [
  { n: 1, path: "qa/evidence/r1/01.png", caption: "01.png", available: true },
  { n: 2, path: "/srv/att/BUG-5.png", caption: "BUG-5.png", available: true },
  { n: 3, path: "/tmp/x.png", caption: "x.png", available: false },
  { n: 4, path: null, caption: "Step 1", available: true, sha256: "a".repeat(64), served_as: "attachment", reason: null },
  { n: 5, path: "qa/evidence/r1/02.png", caption: "Step 2", available: true, sha256: null, served_as: "file", reason: null },
];
const resolver = (open = vi.fn()): ImageResolver => ({
  find: (address) => findImage(beadImages, address),
  url: (n) => {
    const image = beadImages.find((candidate) => candidate.n === n);
    return (image && imageAddress("alpha", "a-1", image)) ?? "";
  },
  open,
});

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

  it("REQ-UI-028 unsafe URLs in links and images never reach href or src", () => {
    const md = [
      "![x](javascript:alert(1))",
      "[a](JaVaScRiPt:alert(1))",
      "[b]( javascript:alert(1))",
      "[c](//evil.com)",
      "[d](data:text/html,x)",
      "[e](vbscript:x)",
      "[f](&#106;avascript:alert(1))",
      "[g][ref]",
      "![y](https://e.com/a.png)",
      "",
      "[ref]: javascript:alert(1)",
    ].join("\n\n");
    const { container } = render(<MarkdownView text={md} />);
    for (const a of container.querySelectorAll("a")) {
      expect(a.getAttribute("href") ?? "").toMatch(/^(https?:|mailto:)/i);
    }
    expect(container.querySelector("img")).toBeNull();
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

  it("REQ-UI-110 a long URL breaks inside the description instead of spilling", () => {
    const url = "https://github.com/Qwikfoneoffice/QwikFone_Office_Backend/pull/263";
    const { container } = render(<MarkdownView text={`PR opened: ${url}`} />);
    expect(container.firstElementChild?.className).toContain("[overflow-wrap:anywhere]");
  });

  it("REQ-UI-028 bead image inline: shown from the images route and opens the lightbox on click", async () => {
    const open = vi.fn();
    render(<MarkdownView text={"![Step 1](qa/evidence/r1/01.png)"} images={resolver(open)} />);
    const img = screen.getByRole("img", { name: "Step 1" });
    expect(img).toHaveAttribute("src", "/api/beads/alpha/a-1/images/1");
    expect(img).toHaveAttribute("loading", "lazy");
    await userEvent.click(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith(1, screen.getByRole("button"));
  });

  it("REQ-UI-028 external image not loaded: a link with the host, no img element", () => {
    const { container } = render(
      <MarkdownView text={"![chart](https://example.com/x.png)\n\n![key](attachment:ab12)"} images={resolver()} />,
    );
    const link = screen.getByRole("link", { name: "Image: chart (example.com)" });
    expect(link).toHaveAttribute("href", "https://example.com/x.png");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByText("key")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("REQ-UI-028 a caller without a resolver shows attachment and relative images as alt text and external ones as links", () => {
    const { container } = render(
      <MarkdownView text={"![a](attachment:1) ![b](shots/b.png) ![c](http://e.com/c.png)"} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("a b");
    expect(screen.getByRole("link", { name: "Image: c (e.com)" })).toBeInTheDocument();
  });

  it("REQ-UI-028 link to a bead image is a button that opens the lightbox", async () => {
    const open = vi.fn();
    render(<MarkdownView text={"[BUG-5.png](file:///srv/att/BUG-5.png) [other](file:///etc/x.png)"} images={resolver(open)} />);
    await userEvent.click(screen.getByRole("button", { name: "BUG-5.png" }));
    expect(open).toHaveBeenCalledWith(2, screen.getByRole("button", { name: "BUG-5.png" }));
    expect(screen.queryByRole("link", { name: "BUG-5.png" })).toBeNull();
    expect(screen.queryByRole("button", { name: "other" })).toBeNull();
    expect(screen.getByText("other")).toBeInTheDocument();
  });

  it("REQ-UI-028 an unavailable bead image is alt text only", () => {
    const { container } = render(<MarkdownView text={"![gone](/tmp/x.png)"} images={resolver()} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("gone");
  });

  it("REQ-UI-028 attachment image inline: one served as attachment, one as file, the local: line as text", () => {
    const sha = "a".repeat(64);
    render(
      <MarkdownView
        text={`![Step 1](attachment:${sha})\nlocal: qa/evidence/r1/01.png\n\n![Step 2](qa/evidence/r1/02.png)`}
        images={resolver()}
      />,
    );
    expect(screen.getByRole("img", { name: "Step 1" })).toHaveAttribute("src", `/api/beads/alpha/a-1/attachments/${sha}`);
    expect(screen.getByRole("img", { name: "Step 2" })).toHaveAttribute("src", "/api/beads/alpha/a-1/images/5");
    expect(screen.getByText(/local: qa\/evidence\/r1\/01\.png/)).toBeInTheDocument();
  });

  it("REQ-UI-028 link to an attachment image opens the lightbox; an unmatched attachment: is alt text", async () => {
    const open = vi.fn();
    const sha = "a".repeat(64);
    const { container } = render(
      <MarkdownView text={`[shot](attachment:${sha}) ![lost](attachment:${"c".repeat(64)})`} images={resolver(open)} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "shot" }));
    expect(open).toHaveBeenCalledWith(4, screen.getByRole("button", { name: "shot" }));
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("lost");
  });
});

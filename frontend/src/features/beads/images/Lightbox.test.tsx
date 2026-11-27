import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Lightbox, type LightboxSlide } from "./Lightbox";

afterEach(cleanup);

const slides: LightboxSlide[] = [
  { key: 1, src: "/api/beads/alpha/a-1/images/1", caption: "First" },
  { key: 3, src: "/api/beads/alpha/a-1/images/3", caption: "Third" },
];

function Host({ start = 1, onClose = vi.fn() }: { start?: number; onClose?: () => void }) {
  const [current, setCurrent] = useState<number | null>(start);
  return (
    <Lightbox
      slides={slides}
      current={current}
      onChange={setCurrent}
      onClose={() => {
        onClose();
        setCurrent(null);
      }}
    />
  );
}

describe("Lightbox", () => {
  it("REQ-BEADS-030 step through available images without wrapping", async () => {
    render(<Host />);
    const dialog = screen.getByRole("dialog", { name: "First" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Third" })).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Third" })).toHaveAttribute("src", "/api/beads/alpha/a-1/images/3");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
  });

  it("REQ-BEADS-030 Escape and the close button close it", async () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    const again = vi.fn();
    render(<Host onClose={again} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(again).toHaveBeenCalledTimes(1);
  });

  it("REQ-BEADS-030 Open original links to the image in a new tab", () => {
    render(<Host />);
    const link = screen.getByRole("link", { name: "Open original" });
    expect(link).toHaveAttribute("href", "/api/beads/alpha/a-1/images/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("REQ-BEADS-030 nothing shows while no image is current", () => {
    render(<Lightbox slides={slides} current={null} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

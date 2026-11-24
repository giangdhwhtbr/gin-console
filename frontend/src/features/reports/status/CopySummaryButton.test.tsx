import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopySummaryButton } from "./CopySummaryButton";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const stubClipboard = (writeText: (text: string) => Promise<void>) => {
  const mock = vi.fn(writeText);
  vi.stubGlobal("navigator", { clipboard: { writeText: mock } });
  return mock;
};

describe("CopySummaryButton", () => {
  it("REQ-REPORTS-038 Copy succeeds: writes the built text and reads Copied for 2 s", async () => {
    vi.useFakeTimers();
    const writeText = stubClipboard(() => Promise.resolve());
    render(<CopySummaryButton buildText={() => "# Summary"} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("# Summary");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("button", { name: "Copy summary" })).toBeInTheDocument();
    expect(screen.queryByText("Couldn't copy")).toBeNull();
  });

  it("REQ-REPORTS-038 Copy fails: shows Couldn't copy when the write rejects", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    render(<CopySummaryButton buildText={() => "x"} />);

    await userEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    expect(await screen.findByText("Couldn't copy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy summary" })).toBeInTheDocument();
  });

  it("REQ-REPORTS-038 Copy fails: shows Couldn't copy when there is no clipboard", async () => {
    vi.stubGlobal("navigator", {});
    render(<CopySummaryButton buildText={() => "x"} />);

    await userEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    expect(await screen.findByText("Couldn't copy")).toBeInTheDocument();
  });
});

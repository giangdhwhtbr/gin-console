import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QaFailure } from "./api";
import { QaError } from "./QaError";

afterEach(cleanup);

describe("QaError", () => {
  it("REQ-QA-013 names a missing gin-qa", () => {
    render(<QaError failure={new QaFailure("x", 502, "missing")} onRetry={vi.fn()} />);
    expect(screen.getByText("gin-qa is not installed on the console host")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("REQ-QA-013 names an outdated gin-qa and the command", () => {
    render(<QaError failure={new QaFailure("x", 502, "outdated")} onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa");
  });

  it("REQ-QA-013 shows any other error with Try again", async () => {
    const retry = vi.fn();
    render(<QaError failure={new QaFailure("gin-qa timed out", 502)} onRetry={retry} />);
    expect(screen.getByText("gin-qa timed out")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

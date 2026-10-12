import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "./ProjectsPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest("tr");
  if (row === null) throw new Error(`no table row for ${name}`);
  return row;
}

afterEach(() => vi.unstubAllGlobals());

describe("ProjectsPage", () => {
  // REQ-UI-001
  it("REQ-UI-001 lists projects and marks missing ones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json([
          { name: "qwikfone", path: "/home/gin/qwikfone", scotty_id: "qwikfone", exists: true },
          { name: "old", path: "/home/gin/old", scotty_id: null, exists: false },
        ]),
      ),
    );
    render(<ProjectsPage />);
    await screen.findByText("qwikfone");
    expect(within(rowOf("qwikfone")).getByText("/home/gin/qwikfone")).toBeInTheDocument();
    expect(within(rowOf("qwikfone")).queryByText("missing")).not.toBeInTheDocument();
    expect(within(rowOf("old")).getByText("missing")).toBeInTheDocument();
  });

  // REQ-UI-001
  it("REQ-UI-001 shows an empty state naming the config file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
    render(<ProjectsPage />);
    expect(await screen.findByText(/no projects configured/i)).toBeInTheDocument();
    expect(screen.getByText(/~\/\.config\/gin-console\/config\.yaml/)).toBeInTheDocument();
  });

  // REQ-UI-002
  it("REQ-UI-002 shows an error and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ detail: "boom" }, 500))
      .mockResolvedValueOnce(
        json([{ name: "scotty", path: "/home/gin/scotty", scotty_id: null, exists: true }]),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ProjectsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("scotty")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

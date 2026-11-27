import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInPage } from "./SignInPage";
import { getSession, loadSession } from "./session";

const reply = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers });

beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { enabled: true, user: null }))));
  await loadSession();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function submit(password = "secret") {
  await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "an");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInPage", () => {
  it("REQ-AUTH-014 shows the heading and the two fields", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { name: "gin-console" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveAttribute("autocomplete", "username");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("REQ-AUTH-014 a right password signs in", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(200, { name: "An", email: "an@example.com", projects: ["a"] }))));
    render(<SignInPage />);
    await submit();
    await waitFor(() => expect(getSession().status).toBe("signed-in"));
  });

  it("REQ-AUTH-014 wrong password: message and cleared password", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(401, {}))));
    render(<SignInPage />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong username or password");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("an");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("REQ-AUTH-014 too many attempts names the minutes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(429, {}, { "Retry-After": "600" }))));
    render(<SignInPage />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again in 10 minutes");
  });

  it("REQ-AUTH-014 one minute is singular", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(reply(429, {}, { "Retry-After": "30" }))));
    render(<SignInPage />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again in 1 minute");
    expect(screen.getByRole("alert")).not.toHaveTextContent("minutes");
  });

  it("REQ-AUTH-014 an unreachable server shows an error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("down"))));
    render(<SignInPage />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the console. Try again.");
  });

  it("REQ-AUTH-014 the button is disabled while submitting", async () => {
    let finish: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))));
    render(<SignInPage />);
    await submit();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    finish(reply(401, {}));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled());
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMAIL_KEY, getEmail, resetIdentity } from "./identity";
import { LoginPage } from "./LoginPage";

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetIdentity();
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("REQ-UI-097 a valid email is stored lower-cased", async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), " Giangdhwhtbr@Gmail.com ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(getEmail()).toBe("giangdhwhtbr@gmail.com");
  });

  it("REQ-UI-097 an invalid email is refused", async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "giang");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent("not a valid email");
    expect(getEmail()).toBeNull();
    expect(localStorage.getItem(EMAIL_KEY)).toBeNull();
  });

  it("REQ-UI-097 storage refused keeps the email without an error", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(<LoginPage />);
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "a@b.c");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(getEmail()).toBe("a@b.c");
  });
});

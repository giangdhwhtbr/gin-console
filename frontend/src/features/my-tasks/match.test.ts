import { describe, expect, it } from "vitest";
import { isMine } from "./match";

const email = "giangdhwhtbr@gmail.com";

describe("isMine", () => {
  it.each(["giangdhwhtbr", "GiangDHWHTBR@gmail.com", " giangdhwhtbr ", "giangdhwhtbr@other.com"])(
    "REQ-UI-100 matches the assignee %j",
    (assignee) => {
      expect(isMine({ assignee }, email)).toBe(true);
    },
  );

  it.each(["alice", "giang", null, "", "  "])(
    "REQ-UI-100 does not match the assignee %j",
    (assignee) => {
      expect(isMine({ assignee }, email)).toBe(false);
    },
  );

  it("REQ-UI-100 REQ-BEADS-023 ignores the owner", () => {
    const owned: Pick<{ assignee: string | null; owner: string | null }, "assignee"> = { assignee: null };
    expect(isMine(owned, email)).toBe(false);
  });
});

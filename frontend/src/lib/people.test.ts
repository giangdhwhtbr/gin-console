import { describe, expect, it } from "vitest";
import { personOf, samePerson } from "./people";

describe("people", () => {
  it.each([
    ["  GiangDHWHTBR@gmail.com ", "giangdhwhtbr"],
    ["giangdhwhtbr", "giangdhwhtbr"],
    ["", null],
    ["   ", null],
    [null, null],
    [undefined, null],
    ["@x", "@x"],
  ])("REQ-BEADS-023 personOf(%j) is %j", (value, person) => {
    expect(personOf(value)).toBe(person);
  });

  it("REQ-BEADS-023 an email and its handle are the same person", () => {
    expect(samePerson("Alice@Example.com", "alice")).toBe(true);
    expect(samePerson("alice", "bob")).toBe(false);
    expect(samePerson(null, null)).toBe(false);
  });
});

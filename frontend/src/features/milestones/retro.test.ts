import { describe, expect, it } from "vitest";
import { parseRetros } from "./retro";

const c = (text: string, created_at = "2026-11-10T10:00:00Z", author = "gin") => ({ author, created_at, text });

describe("parseRetros", () => {
  it("REQ-MILESTONE-UI-019 close holds only the present labels, in label order", () => {
    const { close } = parseRetros(
      [c("[gin close] m1\nAction: ship it\nDelivered: a\nSpillover: b", "2026-11-10T10:00:00Z", "lead")],
      "m1",
    );
    expect(close).toEqual({
      author: "lead",
      created_at: "2026-11-10T10:00:00Z",
      sections: [
        { label: "Delivered", text: "a" },
        { label: "Spillover", text: "b" },
        { label: "Action", text: "ship it" },
      ],
    });
  });

  it("REQ-MILESTONE-UI-019 the newest close wins", () => {
    const { close } = parseRetros(
      [c("[gin close] m1\nDelivered: new", "2026-11-12T00:00:00Z"), c("[gin close] m1\nDelivered: old", "2026-11-10T00:00:00Z")],
      "m1",
    );
    expect(close?.sections).toEqual([{ label: "Delivered", text: "new" }]);
  });

  it("REQ-MILESTONE-UI-019 newest retro per member, sorted by member", () => {
    const { retros } = parseRetros(
      [
        c("[gin retro] m1 bao\nWent well: x"),
        c("[gin retro] m1 ann\nWent well: old", "2026-11-10T00:00:00Z"),
        c("[gin retro] m1 ann\nWent well: new\nSlowed us: s\nChange next: n", "2026-11-12T00:00:00Z"),
      ],
      "m1",
    );
    expect(retros.map((r) => r.member)).toEqual(["ann", "bao"]);
    expect(retros[0].sections).toEqual([
      { label: "Went well", text: "new" },
      { label: "Slowed us", text: "s" },
      { label: "Change next", text: "n" },
    ]);
  });

  it("REQ-MILESTONE-UI-019 other milestones are ignored, the id matching exactly", () => {
    const out = parseRetros(
      [c("[gin retro] m2 ann\nWent well: x"), c("[gin retro] m10 ann\nWent well: x"), c("[gin close] m10\nDelivered: x"), c("[gin retro] m1\nWent well: x")],
      "m1",
    );
    expect(out.close).toBeNull();
    expect(out.retros).toEqual([]);
    expect(out.unparsed.map((u) => u.kind)).toEqual(["retro"]); // m1 itself, with no member
  });

  it("REQ-MILESTONE-UI-019 a matching comment with no labels is not in the expected format", () => {
    const { retros, unparsed } = parseRetros([c("[gin retro] m1 chi\njust words", "2026-11-10T00:00:00Z", "chi")], "m1");
    expect(retros).toEqual([]);
    expect(unparsed).toEqual([
      { kind: "retro", member: "chi", author: "chi", created_at: "2026-11-10T00:00:00Z", text: "[gin retro] m1 chi\njust words" },
    ]);
  });

  it("REQ-MILESTONE-UI-019 text runs over several lines until the next label", () => {
    const { retros } = parseRetros([c("[gin retro] m1 ann\nWent well: one\n- two\n\nthree\nSlowed us: s")], "m1");
    expect(retros[0].sections).toEqual([
      { label: "Went well", text: "one\n- two\n\nthree" },
      { label: "Slowed us", text: "s" },
    ]);
  });

  it("REQ-MILESTONE-UI-019 labels are case-sensitive and start a line", () => {
    const { retros, unparsed } = parseRetros([c("[gin retro] m1 ann\nwent well: x\nsee Went well: y")], "m1");
    expect(retros).toEqual([]);
    expect(unparsed).toHaveLength(1);
  });

  it("REQ-MILESTONE-UI-019 a retro without a member name is not in the expected format", () => {
    const { retros, unparsed } = parseRetros([c("[gin retro] m1\nWent well: x")], "m1");
    expect(retros).toEqual([]);
    expect(unparsed[0]).toMatchObject({ kind: "retro", member: null });
  });
});

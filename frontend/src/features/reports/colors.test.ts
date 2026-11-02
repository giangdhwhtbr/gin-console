import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAGES, TYPES, stageColor, typeColor } from "./colors";

// Tailwind 4 emits a @theme variable only when its full name appears in the sources, so a
// chart color built at run time must name a variable declared outside @theme
const css = readFileSync("src/index.css", "utf8") // vitest runs from frontend/;
const outsideTheme = css.replace(/@theme[^{]*\{[^}]*\}/g, "");

describe("REQ-UI-089 REQ-UI-090 chart colors", () => {
  const colors = [...STAGES.map(stageColor), ...TYPES.map(typeColor)];

  it.each(colors)("REQ-UI-089 %s names a variable the stylesheet declares", (color) => {
    const name = /^var\((--[\w-]+)\)$/.exec(color)?.[1];
    expect(name && outsideTheme.includes(`${name}:`)).toBe(true);
  });

  it("REQ-UI-089 each stage takes its own slot", () => {
    expect(new Set(STAGES.map(stageColor)).size).toBe(STAGES.length);
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = resolve(import.meta.dirname, "..");
const css = readFileSync(join(src, "index.css"), "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [path] : [];
  });
}

const OFF_SCALE = [/\btext-(lg|3xl|[5-9]xl)\b/, /\btext-\[\d/, /fontSize:\s*(?=\S)(?!["']?(?:12|13|14|16|20|28|40)(?:px)?\b)/];

describe("type scale", () => {
  it("REQ-UI-137: no class or style sets a font size outside 12, 13, 14, 16, 20, 28 and 40px", () => {
    const hits = sources(src).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (OFF_SCALE.some((re) => re.test(line)) ? [`${file.slice(src.length + 1)}:${i + 1}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("REQ-UI-137: the body is 14px and draws tabular figures", () => {
    const body = css.slice(css.indexOf("  body {"), css.indexOf("}", css.indexOf("  body {")));
    expect(body).toContain("font-size: 14px");
    expect(body).toContain("tabular-nums");
  });
});

describe("typeface", () => {
  it("REQ-UI-136: Recursive is imported, Geist is gone and .font-mono draws the Mono voice", () => {
    expect(css).toContain("@fontsource-variable/recursive/mono.css");
    expect(css.toLowerCase()).not.toContain("geist");
    const rule = css.slice(css.indexOf(".font-mono {"), css.indexOf("}", css.indexOf(".font-mono {")));
    expect(rule).toContain('"MONO" 1');
  });
});

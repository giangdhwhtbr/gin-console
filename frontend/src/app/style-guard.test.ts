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

const SIZES = "(?:12|13|14|16|20|28|40)";
const OFF_SCALE = [
  /\btext-(lg|3xl|[5-9]xl)\b/,
  /\btext-\[(?!var\(|color:)/,
  new RegExp(`fontSize\\s*[:=]\\s*(?=\\S)(?!\\{?["']?${SIZES}(?:px)?["']?\\}?\\s*[,;}/>)\\s]|\\{?["']?${SIZES}(?:px)?["']?\\}?$)`),
];
const offScale = (line: string): boolean => OFF_SCALE.some((re) => re.test(line));

describe("type scale", () => {
  it("REQ-UI-137: no class or style sets a font size outside 12, 13, 14, 16, 20, 28 and 40px", () => {
    const hits = sources(src).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (offScale(line) ? [`${file.slice(src.length + 1)}:${i + 1}`] : [])),
    );
    expect(hits).toEqual([]);
  });

  it("REQ-UI-137: the matcher catches fractional, bare-bracket and JSX sizes and lets the scale through", () => {
    for (const bad of ["fontSize: 12.5,", "text-[.8rem]", "text-[11px]", "fontSize={11}", 'fontSize="11"', "fontSize: 11"]) {
      expect(offScale(bad), bad).toBe(true);
    }
    for (const ok of ["fontSize: 12,", "fontSize: 12 };", "fontSize={13}", 'fontSize="16px"', "text-[var(--x)]", "text-[color:red]", "text-13"]) {
      expect(offScale(ok), ok).toBe(false);
    }
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
    const rule = css.slice(css.indexOf(".font-mono"), css.indexOf("}", css.indexOf(".font-mono")));
    expect(rule).toContain('"MONO" 1');
    for (const el of ["code", "kbd", "samp", "pre"]) expect(css.slice(css.indexOf(".font-mono"), css.indexOf("{", css.indexOf(".font-mono"))).split(/[\s,]+/)).toContain(el);
    expect(css).toContain('--default-mono-font-variation-settings: "MONO" 1');
  });
});

describe("plain text style", () => {
  const lines = sources(src).flatMap((file) => {
    const name = file.slice(src.length + 1);
    return readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ name, at: `${name}:${i + 1}`, line }));
  });
  // the document title of REQ-UI-063 is the one place that joins with a middle dot
  const TITLE_FILES = ["app/usePageTitle.ts", "features/reports/ReportsView.tsx", "features/requirements/RequirementsPage.tsx"];

  it("REQ-UI-139: no class sets text in capitals", () => {
    expect(lines.filter(({ line }) => /\buppercase\b/.test(line)).map(({ at }) => at)).toEqual([]);
  });

  it("REQ-UI-139: no text joins facts with a middle dot outside the document title", () => {
    expect(lines.filter(({ name, line }) => line.includes("·") && !TITLE_FILES.includes(name)).map(({ at }) => at)).toEqual([]);
  });

  it("REQ-UI-139: only .prose-link and the dotted hint trigger set an underline", () => {
    // a dotted underline marks a hint trigger (WorkflowCard Items), not a link
    expect(lines.filter(({ line }) => /\bunderline/.test(line) && !line.includes("decoration-dotted")).map(({ at }) => at)).toEqual([]);
  });
});

describe("control outlines", () => {
  it("REQ-UI-059 Contrast: inputs, selects and textareas draw their outline in --input", () => {
    expect(css).toMatch(/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),\s*select,\s*textarea\s*\{[^}]*border-color:\s*var\(--input\)/);
  });
});

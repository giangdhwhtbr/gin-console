import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(import.meta.dirname, "../../index.html"), "utf8");

describe("index.html", () => {
  it("REQ-UI-063 sets the document title", () => {
    expect(html).toContain("<title>gin-console</title>");
  });
});

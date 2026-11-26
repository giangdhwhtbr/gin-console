import { describe, expect, it } from "vitest";
import type { BeadImage } from "../api";
import { findImage, imagePath } from "./match";

const images: BeadImage[] = [
  { n: 1, path: "qa/a b.png", caption: "a", available: true },
  { n: 2, path: "/srv/att/x.png", caption: "x", available: false },
  { n: 3, path: "/srv/att/y.png", caption: "y", available: true },
];

describe("image match", () => {
  it("REQ-UI-028 imagePath drops file:// and decodes percent escapes, keeping a bad escape", () => {
    expect(imagePath("file:///srv/att/y.png")).toBe("/srv/att/y.png");
    expect(imagePath("qa/a%20b.png")).toBe("qa/a b.png");
    expect(imagePath("100%.png")).toBe("100%.png");
  });

  it("REQ-UI-028 findImage returns an available image by its path only", () => {
    expect(findImage(images, "qa/a%20b.png")?.n).toBe(1);
    expect(findImage(images, "file:///srv/att/y.png")?.n).toBe(3);
    expect(findImage(images, "/srv/att/x.png")).toBeNull();
    expect(findImage(images, "other.png")).toBeNull();
  });
});

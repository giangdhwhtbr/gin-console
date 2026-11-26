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
    expect(imagePath("a%20b%.png")).toBe("a%20b%.png");
    expect(imagePath("c%2.png")).toBe("c%2.png");
  });

  it("REQ-BEADS-026 imagePath reads file://localhost as this host, drops another host, keeps a drive", () => {
    expect(imagePath("file://localhost/x/y.png")).toBe("/x/y.png");
    expect(imagePath("FILE://LocalHost/x/y.png")).toBe("/x/y.png");
    expect(imagePath("file://server/share/a.png")).toBeNull();
    expect(imagePath("file://localhost")).toBeNull();
    expect(imagePath("file:///C:/shots/a.png")).toBe("C:/shots/a.png");
    expect(imagePath("file:///c%3A/shots/d.png")).toBe("c:/shots/d.png");
    expect(imagePath("file:///srv/a%20b.png")).toBe("/srv/a b.png");
  });

  it("REQ-UI-028 findImage matches no image for a file URL of another host", () => {
    expect(findImage(images, "file://server/srv/att/y.png")).toBeNull();
    expect(findImage(images, "file://localhost/srv/att/y.png")?.n).toBe(3);
  });

  it("REQ-UI-028 findImage returns an available image by its path only", () => {
    expect(findImage(images, "qa/a%20b.png")?.n).toBe(1);
    expect(findImage(images, "file:///srv/att/y.png")?.n).toBe(3);
    expect(findImage(images, "/srv/att/x.png")).toBeNull();
    expect(findImage(images, "other.png")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { LABEL_CHAR_PX, placeAxisLabels } from "./axisLabels";

const every = (step: number, columns: number) =>
  Array.from({ length: columns }, (_, index) => index)
    .filter((index) => index % step === 0 || index === columns - 1)
    .map((index) => ({ index, text: `${index + 1} Nov` }));

const overlap = (labels: ReturnType<typeof placeAxisLabels>) =>
  labels.some((a, i) => i > 0 && labels[i - 1].left + labels[i - 1].text.length * LABEL_CHAR_PX > a.left);

describe("placeAxisLabels", () => {
  it("REQ-UI-110 labels that would overlap are thinned, at every width from 330px", () => {
    for (const width of [330, 360, 480, 640, 1000]) {
      const kept = placeAxisLabels(every(2, 16), 16, width);
      expect(overlap(kept), `${width}px`).toBe(false);
      expect(kept[0].index).toBe(0);
      expect(kept[kept.length - 1].index).toBe(15);
    }
    expect(placeAxisLabels(every(2, 16), 16, 330).length).toBeLessThan(every(2, 16).length);
  });

  it("REQ-UI-110 labels with room are all kept, and stay inside the plot", () => {
    const kept = placeAxisLabels(every(5, 16), 16, 1000);
    expect(kept.map((l) => l.index)).toEqual([0, 5, 10, 15]);
    for (const l of kept) {
      expect(l.left).toBeGreaterThanOrEqual(0);
      expect(l.left + l.text.length * LABEL_CHAR_PX).toBeLessThanOrEqual(1000);
    }
  });
});

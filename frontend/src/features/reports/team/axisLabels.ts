/** Room a character of an axis label takes at 12px in the Recursive face, a little over its widest digit. */
export const LABEL_CHAR_PX = 7.5;
const LABEL_GAP_PX = 8;

export interface AxisLabel {
  index: number;
  text: string;
}

export interface PlacedLabel extends AxisLabel {
  /** px from the left edge of the plot to the label's left edge */
  left: number;
}

/**
 * REQ-UI-110: the labels to draw under `columns` columns across `width` px, none over another. A label is centred on its
 * column and pulled inside the plot at either edge. Going left to right a label that would touch the one before it is
 * left out, except the last, which stays and takes the place of the earlier ones it touches.
 */
export function placeAxisLabels(labels: AxisLabel[], columns: number, width: number): PlacedLabel[] {
  const placed = labels.map((label) => {
    const w = label.text.length * LABEL_CHAR_PX;
    const centred = ((label.index + 0.5) / columns) * width - w / 2;
    return { ...label, left: Math.max(0, Math.min(centred, width - w)) };
  });
  const widthOf = (p: PlacedLabel) => p.text.length * LABEL_CHAR_PX;
  const touches = (a: PlacedLabel, b: PlacedLabel) => a.left + widthOf(a) + LABEL_GAP_PX > b.left;
  const kept: PlacedLabel[] = [];
  placed.forEach((label, at) => {
    const previous = kept[kept.length - 1];
    if (previous === undefined || !touches(previous, label)) {
      kept.push(label);
    } else if (at === placed.length - 1) {
      while (kept.length > 1 && touches(kept[kept.length - 1], label)) kept.pop();
      if (kept.length === 1 && touches(kept[0], label)) kept.pop();
      kept.push(label);
    }
  });
  return kept;
}

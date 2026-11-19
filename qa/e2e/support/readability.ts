// Readability check (REQ-UI-110): text that overlaps other visible text or a shape, text that spills out of
// its box, and text below WCAG contrast. The detector runs in the page (readability-inpage.js, shared with
// qa/e2e/readability-live.js); this helper makes the page tall enough to hit-test everything and returns
// plain findings.
import type { Page } from '@playwright/test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { inPage } = require('./readability-inpage.js') as { inPage: () => Array<Finding & { box?: unknown }> };

export type Finding = {
  kind: 'overlap' | 'shape' | 'spill' | 'contrast';
  text: string;
  other?: string;
  selector: string;
  detail: string;
};

const MAX_HEIGHT = 8000;

/** Findings of the page as rendered now; `[]` means every text is readable. */
export async function readabilityFindings(page: Page, opts: { tall?: boolean } = {}): Promise<Finding[]> {
  const original = page.viewportSize();
  const frame = () => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  if (original && opts.tall !== false) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height > original.height) {
      await page.setViewportSize({ width: original.width, height: Math.min(height, MAX_HEIGHT) });
      await frame();
    }
  }
  try {
    const found = await page.evaluate(inPage);
    return found.map(({ kind, text, other, selector, detail }) => ({ kind, text, ...(other === undefined ? {} : { other }), selector, detail }));
  } finally {
    if (original) await page.setViewportSize(original);
  }
}

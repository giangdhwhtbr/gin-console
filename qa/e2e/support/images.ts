// Stubs for the images of a bead (REQ-BEADS-002 `images`, REQ-BEADS-028 `GET /api/beads/{project}/{id}/images/{n}`).
import type { Page } from '@playwright/test';
import { type BeadSummary, beadDetail, stubApi, stubBeadDetails } from './api';

export type BeadImage = { n: number; path: string; caption: string; available: boolean };

/** A 1x1 PNG, the body of every available image. */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
);

/** An image of a bead; `available` defaults to true and `caption` to the file name. */
export const image = (n: number, path: string, o: Partial<BeadImage> = {}): BeadImage => ({
  n, path, caption: path.split('/').pop() ?? path, available: true, ...o,
});

/**
 * Bead page of `b` in `project` with `images` (and `detail`, any other field of the detail), its list entry, and the image route: an image of `images` that is
 * available answers the PNG, any other number answers 404. Returns the image URLs the page requested.
 */
export async function stubBeadWithImages(
  page: Page,
  project: string,
  b: BeadSummary,
  images: BeadImage[],
  o: { description?: string; detail?: Record<string, unknown> } = {},
): Promise<{ images: string[] }> {
  const requested: string[] = [];
  await stubApi(page, { projects: [project], beads: [b] });
  await stubBeadDetails(page, project, [{ ...beadDetail(b), ...(o.description === undefined ? {} : { description: o.description }), ...o.detail, images } as ReturnType<typeof beadDetail>]);
  await page.route(`**/api/beads/${project}/${b.id}/images/*`, async (route) => {
    const url = new URL(route.request().url());
    requested.push(url.pathname);
    const n = Number(url.pathname.split('/').pop());
    const found = images.find((i) => i.n === n && i.available);
    await route.fulfill(found ? { status: 200, contentType: 'image/png', body: PNG } : { status: 404, json: { error: 'not found' } });
  });
  return { images: requested };
}

// Stubs for the images of a bead (REQ-BEADS-002 `images`, REQ-BEADS-028 `GET /api/beads/{project}/{id}/images/{n}`,
// REQ-BEADS-032 `GET /api/beads/{project}/{id}/attachments/{sha256}`).
import type { Page } from '@playwright/test';
import { type BeadSummary, beadDetail, stubApi, stubBeadDetails } from './api';

export type ImageReason = 'not_listed' | 'pruned' | 'unsupported_store' | 'not_fetched';
export type BeadImage = {
  n: number; path: string | null; sha256?: string | null; caption: string; available: boolean;
  served_as?: 'attachment' | 'file' | null; reason?: ImageReason | null;
};

/** A 1x1 PNG, the body of every available image. */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
);

/** An image of a bead; `available` defaults to true and `caption` to the file name. */
export const image = (n: number, path: string, o: Partial<BeadImage> = {}): BeadImage => ({
  n, path, caption: path.split('/').pop() ?? path, available: true, ...o,
});

/** An attachment of a bead (REQ-BEADS-026): the `sha256` and, unless `o` says otherwise, no file. Available, it is served as an attachment. */
export const attachment = (n: number, sha256: string, o: Partial<BeadImage> = {}): BeadImage => {
  const available = o.available ?? true;
  return {
    n, path: null, sha256, caption: sha256.slice(0, 12), available,
    served_as: available ? 'attachment' : null, reason: available ? null : 'not_fetched', ...o,
  };
};

/**
 * Bead page of `b` in `project` with `images` (and `detail`, any other field of the detail), its list entry, and the image route: an image of `images` that is
 * available answers the PNG, any other number answers 404; an attachment of `images` that is available answers the PNG on the attachment route, except those whose `n` is in `broken` (404). Returns the image URLs the page requested.
 */
export async function stubBeadWithImages(
  page: Page,
  project: string,
  b: BeadSummary,
  images: BeadImage[],
  o: { description?: string; detail?: Record<string, unknown>; broken?: number[] } = {},
): Promise<{ images: string[] }> {
  const requested: string[] = [];
  const attachments = images.filter((i) => i.available && i.served_as === 'attachment');
  await stubApi(page, { projects: [project], beads: [b] });
  await stubBeadDetails(page, project, [{ ...beadDetail(b), ...(o.description === undefined ? {} : { description: o.description }), ...o.detail, images } as ReturnType<typeof beadDetail>]);
  await page.route(`**/api/beads/${project}/${b.id}/images/*`, async (route) => {
    const url = new URL(route.request().url());
    requested.push(url.pathname);
    const n = Number(url.pathname.split('/').pop());
    const found = images.find((i) => i.n === n && i.available && i.served_as !== 'attachment');
    await route.fulfill(found ? { status: 200, contentType: 'image/png', body: PNG } : { status: 404, json: { error: 'not found' } });
  });
  await page.route(`**/api/beads/${project}/${b.id}/attachments/*`, async (route) => {
    const url = new URL(route.request().url());
    requested.push(url.pathname);
    const found = attachments.find((i) => i.sha256 === url.pathname.split('/').pop() && !o.broken?.includes(i.n));
    await route.fulfill(found ? { status: 200, contentType: 'image/png', body: PNG } : { status: 404, json: { error: 'not found' } });
  });
  return { images: requested };
}

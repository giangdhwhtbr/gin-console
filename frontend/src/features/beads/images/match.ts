import type { BeadImage } from "../api";

/** The path of an image address as the server writes it: no `file://`, percent-decoded (REQ-BEADS-026). */
export function imagePath(address: string): string {
  const bare = address.replace(/^file:\/\//i, "");
  try {
    return decodeURIComponent(bare);
  } catch {
    return bare;
  }
}

/** The available image of a bead that an address names, or null. */
export function findImage(images: readonly BeadImage[], address: string): BeadImage | null {
  const path = imagePath(address);
  return images.find((image) => image.available && image.path === path) ?? null;
}

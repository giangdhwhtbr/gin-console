import type { BeadImage } from "../api";

const FILE_URL = /^file:\/\/([^/]*)(\/.*)?$/is;
const SLASH_DRIVE = /^\/[A-Za-z]:\//;

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * The path of an image address as the server writes it, percent-decoded (REQ-BEADS-026): a
 * `file://` URL of this host (no host or `localhost`) gives its path, `/C:/…` as `C:/…`; a file URL
 * of another host gives null.
 */
export function imagePath(address: string): string | null {
  if (address.slice(0, 7).toLowerCase() !== "file://") return decode(address);
  const url = FILE_URL.exec(address);
  if (url === null || url[2] === undefined || !["", "localhost"].includes(url[1].toLowerCase())) {
    return null;
  }
  const path = decode(url[2]);
  return SLASH_DRIVE.test(path) ? path.slice(1) : path;
}

/** The available image of a bead that an address names, or null. */
export function findImage(images: readonly BeadImage[], address: string): BeadImage | null {
  const path = imagePath(address);
  if (path === null) return null;
  return images.find((image) => image.available && image.path === path) ?? null;
}

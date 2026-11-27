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

const ATTACHMENT = /^attachment:([0-9a-f]{64})$/i;

/** The lower-case `sha256` of an `attachment:<64 hex digits>` address, or null. */
export function attachmentSha(address: string): string | null {
  const match = ATTACHMENT.exec(address);
  return match === null ? null : match[1].toLowerCase();
}

/** The available image of a bead that an address names, or null: an `attachment:` address by `sha256`, any other by path. */
export function findImage(images: readonly BeadImage[], address: string): BeadImage | null {
  const sha = attachmentSha(address);
  if (sha !== null) return images.find((image) => image.available && image.sha256 === sha) ?? null;
  const path = imagePath(address);
  if (path === null) return null;
  return images.find((image) => image.available && image.path === path) ?? null;
}

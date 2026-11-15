/** REQ-UI-107: an id longer than 24 characters as its first 14, "…" and its last 9; shorter ids unchanged. */
export function shortId(id: string): string {
  return id.length <= 24 ? id : `${id.slice(0, 14)}…${id.slice(-9)}`;
}

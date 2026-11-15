export const CLOSE_LABELS = ["Delivered", "Spillover", "Outcome", "Demo", "Retros", "Metrics", "Action"] as const;
export const RETRO_LABELS = ["Went well", "Slowed us", "Change next"] as const;

export type Section = { label: string; text: string };
export type CloseEntry = { author: string; created_at: string; truncated: boolean; sections: Section[] };
export type RetroEntry = { member: string; author: string; created_at: string; truncated: boolean; sections: Section[] };
export type RawEntry = { kind: "close" | "retro"; member: string | null; author: string; created_at: string; text: string; truncated: boolean };

type Source = { author: string; created_at: string; text: string; truncated: boolean };

/** The text after each label that starts a line, up to the next label line, in the order of `labels`. */
function sectionsOf(text: string, labels: readonly string[]): Section[] {
  const found = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of text.split("\n").slice(1)) {
    const label = labels.find((l) => line.startsWith(`${l}:`));
    if (label !== undefined) {
      current = found.get(label) ?? [];
      current.push(line.slice(label.length + 1).trimStart()); // a repeated label adds to its section
      found.set(label, current);
    } else current?.push(line);
  }
  return labels.flatMap((label) => {
    const lines = found.get(label);
    const body = lines === undefined ? "" : lines.join("\n").trim();
    return body === "" ? [] : [{ label, text: body }];
  });
}

const newer = (a: { created_at: string }, b: { created_at: string }) => Date.parse(a.created_at) > Date.parse(b.created_at);

/** REQ-MILESTONE-UI-019: the close comment and the member retros of milestone `milestoneId`. */
export function parseRetros(
  comments: readonly Source[],
  milestoneId: string,
): { close: CloseEntry | null; retros: RetroEntry[]; unparsed: RawEntry[] } {
  let close: CloseEntry | null = null;
  let closeAt: Source | null = null;
  const byMember = new Map<string, RetroEntry>();
  const unparsed: RawEntry[] = [];
  for (const comment of comments) {
    const [first = ""] = comment.text.split("\n");
    const head = /^\[gin (close|retro)\]\s+(\S+)(?:\s+(.*))?$/.exec(first.trim());
    if (head === null || head[2] !== milestoneId) continue;
    const kind = head[1] === "close" ? "close" : "retro";
    const member = kind === "retro" ? (head[3]?.trim() || null) : null;
    const sections = sectionsOf(comment.text, kind === "close" ? CLOSE_LABELS : RETRO_LABELS);
    const { author, created_at, truncated } = comment;
    if (sections.length === 0 || (kind === "retro" && member === null)) {
      unparsed.push({ kind, member, author, created_at, text: comment.text, truncated });
    } else if (kind === "close") {
      if (closeAt === null || newer(comment, closeAt)) {
        close = { author, created_at, truncated, sections };
        closeAt = comment;
      }
    } else if (member !== null) {
      const kept = byMember.get(member);
      if (kept === undefined || newer(comment, kept)) byMember.set(member, { member, author, created_at, truncated, sections });
    }
  }
  const retros = [...byMember.values()].sort((a, b) => a.member.localeCompare(b.member));
  return { close, retros, unparsed };
}

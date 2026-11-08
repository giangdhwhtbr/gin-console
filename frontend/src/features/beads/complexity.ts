export type Complexity = "low" | "medium" | "high";

/** The level on a roadmap epic's `Complexity: high (why)` description line. */
export function complexityOf(description: string | null): Complexity | null {
  const level = /^Complexity:\s*(low|medium|high)\b/im.exec(description ?? "")?.[1].toLowerCase();
  return level === "low" || level === "medium" || level === "high" ? level : null;
}

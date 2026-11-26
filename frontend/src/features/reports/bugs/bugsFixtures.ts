import type { BugsReport } from "./bugsApi";

/** A bugs report of project `alpha` for the week of 2026-11-23, with every field set. */
export const bugsReport = (overrides: Partial<BugsReport> = {}): BugsReport => ({
  generated_at: "2026-11-25T12:00:00Z",
  project: "alpha",
  today: "2026-11-25",
  milestone: null,
  days: 30,
  period: { start: "2026-10-27", end: "2026-11-25" },
  figures: { total: 14, opened: 13, closed: 11, open_now: 3, oldest_open_days: 43, median_close_days: 0.5 },
  weeks: [
    { start: "2026-11-16", opened: 5, closed: 3 },
    { start: "2026-11-23", opened: 0, closed: 0 },
  ],
  epics: [
    { id: "e-2", title: "Checkout", opened: 5, closed: 4, open_now: 1 },
    { id: null, title: null, opened: 8, closed: 7, open_now: 2 },
  ],
  open: [
    { id: "a-1", title: "Crash on save", priority: 0, assignee: "ann", age_days: 43, epic: { id: "e-2", title: "Checkout" } },
    { id: "a-2", title: "Wrong total", priority: null, assignee: null, age_days: 5, epic: null },
    { id: "a-3", title: "Typo", priority: 3, assignee: "bao", age_days: 2, epic: { id: "e-2", title: "Checkout" } },
  ],
  ...overrides,
});

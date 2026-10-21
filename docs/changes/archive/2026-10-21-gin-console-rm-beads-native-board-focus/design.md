# Design: Board and Focus

Epic: gin-console-rm-beads-native

## Architecture
- Backend (`beads/`): `source.list_beads` also runs `bd ready --json` and `bd blocked --json` (read-only, fixed arguments, same runner and 30-second timeout) and `BeadSummary` gains `ready: bool`, `blocked: bool` and `closed_at: str | None`. A bead is `blocked` when `bd blocked` lists it or its status is `blocked`; ids that `bd list` does not return are ignored. `service.py` keeps one cache entry per project and `closed` value for the whole result, so the three commands run together or not at all. A failure of any of them is a `BeadsError` (502) and is not cached. The detail endpoint is unchanged.
- Frontend (`features/beads/`): `BeadList` is split. A new `BeadsView` owns the fetch, the request-order guard, the 10-second refresh and the error banner (what `BeadList` does today) and renders `BeadTable` (List), `BoardView` or `FocusView` according to `view`. `columns.ts` holds the pure rules: `boardColumns`, `focusColumns`, `groupByAssignee`, `recentlyFinished`, so the rules are tested without rendering. `BeadCard` is the shared card. `ViewTabs`, `LaneSelect` and the Focus options are small components, one per file. `filters.ts` gains `view`, `group`, `finished` and `lane` next to the existing URL parameters and falls back to defaults for unknown values.
- Keyboard: one `useCardKeys` hook (a single `keydown` listener on the page) handles `/`, `Esc`, arrows and `Enter`; cards are links in document order, and arrows move focus along that order.
- Why derive columns in the browser: the data is already loaded for the List; a second endpoint per view would multiply `bd` calls.

## Data Flow
Browser polls `GET /api/beads?project=&closed=` every 10 s while visible -> cache hit or `bd list` + `bd ready` + `bd blocked` -> JSON with `ready`, `blocked`, `closed_at`. The view, search, filters, lane, group and "Recently finished" live in the URL and run in the browser; switching view never calls the API. "Recently finished" turns "Show closed" on, because closed beads are only loaded then.

## Error Handling
As in change A: any `bd` problem is a 502 with `error`; the page keeps its last data and shows the error with Retry; unexpected shapes show an error. A bead without `closed_at` is ordered by `updated_at`; an empty or missing assignee goes to "No assignee"; unknown `view`, `group`, `finished` or `lane` values fall back to the default without an error. Everything from `bd` is rendered as React text.

## Testing
Backend: fake runner with canned `list`, `ready` and `blocked` JSON; flags for open, blocked-by-dependency, status blocked, in progress, closed; unknown id ignored; failure and bad shape of each new command give 502 and are not cached; one cache entry for three commands; `closed_at` present and absent. Frontend (vitest): `columns.ts` unit tests (placement, first fitting column, pinned left out, order, 20 and 7 limits, grouping, No assignee); URL parsing with unknown values; view switch keeps filters and makes no request; Board and Focus rendering, empty columns, card content and link; Show all and latest; Group by; Recently finished turning on Show closed; lane including an unknown lane; keyboard `/`, `Esc`, arrows, `Enter`; refresh and stale-response guard still apply to every view. One real-host check against `bd ready` and `bd blocked` of qwikfone.

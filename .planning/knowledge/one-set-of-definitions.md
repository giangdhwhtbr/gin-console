# One set of definitions: blocked, progress, people, late, dates and hints

**Context**
The UX review of 2026-11-21 found the same scope showing 19, 17 and 0 blocked beads, progress that changed with "Show closed", the owner shown as the assignee, one person listed twice (handle and email), a milestone bead reading "Open" while its milestone page said "Active", three rules for "late", five date formats, and marks and counts without explanation. Epic gin-console-rm-definitions (2026-11-22) gave each one rule.

**Decision/Solution**
- **Rules module:** `backend/src/gin_console/beads/definitions.py` is the one home of the bead rules.
  - `is_blocked(ident, row, snapshot)`: not closed, and status `blocked` or in `snapshot.blocked` (an open blocker of its own or of an ancestor, as `bd blocked`).
  - `child_counts(snapshot)`: direct children through `snapshot.parents`, merge gates left out, prep tasks counted apart.
  - `person_key(value)`: trimmed, lower-cased, cut before the first `@`.
  - Projects (`projects/source.py`), the Beads API (`beads/source.py`) and the Team report (`reports/team.py`, `reports/service.py` `member_of`) all call it.
- **Counts:**
  - A bead is counted once: in-progress counts leave blocked beads out.
  - The Team buckets put a blocked in-progress bead in `open`, so `scope = closed + in_progress + open` holds.
  - The Board and Focus place closed, then blocked, then deferred, ready and working beads.
  - Column headers count prep apart ("2 + 1 prep").
- **Progress:** every bead carries `child_counts {total, closed, prep_total, prep_closed}`, whatever `closed` the request has; since gin-console-rm-strung it also has `in_progress`, `blocked`, `ready` and `deferred` (see `strung-visual-system.md`). The detail's `children` list keeps its name.
  - The frontend reads it through `features/beads/progress.ts`: `progressOf` (with `counts` for the strand) and `prepLabel` ("Prep x/y"); `prepWords` was removed when the strand replaced the "x of y done" texts.
- **People:** `frontend/src/lib/people.ts` (`personOf`, `samePerson`) mirrors `person_key`, and both test the same cases.
  - `AssigneeName` shows the person, or a muted "Unassigned", and never the owner.
  - The Assignee filter offers `me` first; `resolveMe` runs where `filterBeads` runs, never in a prop passed down, because List and Focus write `...filters` back to the URL.
  - `parseFilters` reads a stored email as its person, so old links still select the person.
- **Milestones:**
  - `milestones/MilestoneStatus.tsx` is the only status mark. `StateMark` draws it for a milestone bead through `features/beads/milestoneStatus.tsx`.
  - `milestones/late.ts` `lateOf` is the one late rule: open and `today > end` or `finish > end`; closed and `workdaysAfter(end, closedOn) > 0`.
  - Reports requests `GET /api/milestones` once per project and page mount; Refresh remounts the page.
- **Dates:** `frontend/src/lib/dates.ts`.
  - `formatDate` writes "5 Nov" in the current year and "1 Dec 2025" otherwise; a `YYYY-MM-DD` value is a UTC calendar day.
  - `formatDateTime` writes "11 May, 16:00" in the browser time zone.
  - `formatRange` writes the year once after the end.
  - `workdaysAfter` lives only in `milestones/format.ts`.
- **Hints:** `components/ui/tooltip.tsx` `Hint` only clones its child with `aria-describedby` and `data-hint`.
  - One `HintProvider` (in `app/App.tsx`) keeps one hidden description per distinct text and draws one delegated tooltip (`useHintTarget.ts`, `HintTooltip.tsx`).
  - `lib/definitions.ts` holds the sentences, which the Legend (`components/Legend.tsx`) shares.

**Consequences**
- **Tooltip cost:** never mount a Base UI Tooltip per mark. It costs about 1 ms each in jsdom, and 2000 List rows took 18.5 s; with the shared host it was 6.5 s, the same as plain rows. Base UI 1.9 `Tooltip.Popup` sets no `role`.
- **Native `title`** is only for text cut short (REQ-UI-107); every other explanation goes through `Hint`. Marks in rows and cards take no focus, so the Legend covers keyboard and touch users.
- **Required fields:** a required field added to the frontend `BeadSummary` breaks every local test builder and inline JSON body. Find them with `grep -rn "waits_for: null"` and add the default.
- **E2E stubs:** `qa/e2e/support/api.ts` `withCounts()` fills `child_counts` from the stubbed list like the backend; `stubApi` and `lanes.ts` `stubDetails` apply it. `support/lanes.ts` `shown()` writes the REQ-UI-131 date-time.
- **E2E facts:** the Projects page is `/`, not `/projects`. The List assignee column is hidden below the `@4xl` container width, so assignee checks need a 1440px window.
- **Backend fixtures:** `fake_export.bead(parent=...)` does not make a child for counts or blocked inheritance; use `dep(child, parent, "parent-child")`.
- **Plain labels:** "Prep n of m done" is longer than "Prep n/m", so the second Gantt line cuts sooner (ellipsis plus hint). The Pace figure "2.4 done per day" wraps in the large value font; epic gin-console-rm-strung may restyle both.
- **REQ-UI-095:** epic gin-console-5c4 changed it again after this epic archived (tabs without AI usage and Data coverage); its delta used the base hash of this epic's text.

**References**
- Change: `docs/changes/archive/2026-11-22-gin-console-rm-definitions-definitions/`.
- Diagrams: `docs/specs/beads/diagrams/bead-counts-activity.md`, `bead-state.md` and `me-filter-activity.md`; `docs/specs/milestone-ui/diagrams/milestone-state.md` and `milestone-status-activity.md`; `docs/specs/ui/diagrams/legend-tooltip-activity.md`.
- Evidence: `qa/evidence/2026-11-22-definitions-tc1/`; e2e run `qa/evidence/2026-11-22T04-57-11`.
- Beads: gin-console-rm-definitions.1 to .11.

**Scope**
gin-console backend `beads`, `projects` and `reports` contexts; frontend beads views, milestones, reports, `lib/` and `components/`; e2e support.

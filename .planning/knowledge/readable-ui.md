# Readable UI: facts, badges, no colliding text, and the readability check

**Context**
Epic gin-console-3rr (2026-11-19) followed a user complaint (Gantt label text over bars, a faint bead-page meta line with no label/value distinction, points not prominent) and an audit of 47 pages × 9 widths × light/dark. REQ-UI-110 now says: no text over other text or chart shapes, cut text ends with an ellipsis and has a `title`, contrast ≥ 4.5:1 (3:1 large), facts as label/value pairs, priority as a pill, size as a badge.

**Decision/Solution**
- Shared pieces in `frontend/src/components/`: `FactList` (`<dl>`, label `text-xs text-muted-foreground`, value `text-sm font-medium text-foreground`), `PriorityPill` (P0 destructive, P1 amber `state-blocked` — there is no warning token), `SizeBadge` ("<p> pt" or "<n>d"); `frontend/src/lib/dates.ts` `factDate` ("11 May 2026 16:00"). Relations show state words ("In progress"), never raw values.
- Gantt: label column 168px under 1024, 300/380/440px from 1024/1280/1600 (`useLabelWidth`, matchMedia); the label column is an opaque sticky layer (`bg-card z-10`) above lines (`z-[5]`); `tailWidth` cuts titles after bars before the next end/today line; Today/End chips sit on their own header row and `markerSides` shifts Today so they never intersect; `labelledDays` thins day numbers (every day, every 2nd, Mondays; first working day of each month kept).
- `qa/e2e/support/readability-inpage.js` is the detector, shared by `qa/e2e/ui/readability.spec.ts` (stubbed, 13 page groups × 4 widths × 2 themes, fails on unstubbed API calls) and `qa/e2e/readability-live.js` (real console, TC-1). It clips text by every overflow ancestor, checks occlusion with `elementsFromPoint`, trims glyph boxes 15%, flags overlap, shape, spill, crowd (touching layout items, SVG text included) and WCAG contrast, and waits for `document.getAnimations()` plus two frames before measuring.

**Consequences**
- The live run on real data found what the first audit missed (a filter group without `min-w-0` pushed by a `<select>` sized by its longest option; edge labels sharing a midpoint; a long URL; touching day numbers). Run `node qa/e2e/readability-live.js --base http://127.0.0.1:8700 --project example --project qwikfone --out <dir>` after UI changes (about 30 minutes).
- Lessons: `truncate` does nothing on text that is a direct child of an inline-flex `Badge` (wrap it in a `span.truncate`); `opacity-*` on muted text breaks 4.5:1; `break-words` does not shrink min-content (use `overflow-wrap:anywhere`, but reset it on `pre` and `table` so they keep scrolling); `white-space:pre-wrap` hangs trailing spaces outside the box (use `break-spaces`); chart labels belong in overlay layers, ticks need `tickMargin` and 12px; under reduced motion every element has a 0.01ms transition, so measure after animations settle; toggling `html.dark` in place reads mid-transition colors — reload with the stored theme.

**References**
- `frontend/src/components/{FactList,PriorityPill,SizeBadge}.tsx`, `frontend/src/features/milestones/{GanttChart.tsx,gantt.ts,useLabelWidth.ts}`, `frontend/src/features/reports/TabStrip.tsx`, `qa/e2e/support/readability*.{js,ts}`, `qa/e2e/ui/readability.spec.ts`, `qa/e2e/readability-live.js`
- Change: `docs/changes/archive/2026-11-19-gin-console-3rr-readable-ui/` (with the audit report and scripts in `audit/`); evidence `qa/evidence/2026-11-19-3rr-tc1/`
- Beads: gin-console-3rr (tracks .1–.8); related [container-queries-for-lists](container-queries-for-lists.md), [beads-filters-and-epic-kind](beads-filters-and-epic-kind.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md)

**Scope**
Any UI change: run the readability spec, and the live check for layout changes.

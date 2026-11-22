# Strung visual system

**Context**
The UX review of 2026-11-21 found no identity colour, a flat 12/14/20 type scale, teal meaning both ready and closed, five different progress drawings, Gantt rows growing with every warning, pills for every datum, and capitals, middle dots and underlines everywhere. Epic gin-console-rm-strung (2026-11-22) applied the "Strung" direction preview (`docs/specs/ui/assets/2026-11-22/`): beads are gemstones on a thread.

**Decision/Solution**
- **Tokens** (`frontend/src/index.css`): the semantic names stay (`--state-*`, `--primary`, `--ring`, `--destructive`, `--background`, `--card`, `--muted`, `--border`) with Strung values in light and dark; `--identity` and `--identity-wash` are amethyst; `--state-done` equals `--state-ready` (jade); `--input` (#7D8695 / #757B8C) outlines inputs, selects and textareas through a base rule, so they reach 3:1. `--lane-*` and `--series-*` are unchanged. `tokens.test.ts` pins every value and contrast.
- **Type**: `@fontsource-variable/recursive/mono.css` (weight and MONO axes, about 73 KB Latin) replaces Geist. Tailwind 4 preflight sets `font-variation-settings` on code, kbd, samp and pre from `--default-mono-font-variation-settings`, so the Mono voice needs that theme token as well as the `.font-mono, code, kbd, samp, pre` rule. Sizes are only 12/13/14/16/20/28/40 (`text-xs`, `text-13`, `text-sm`, `text-base`, `text-xl`, `text-2xl` = 28, `text-4xl` = 40); `text-lg` and `text-3xl`+ are unset in `@theme`. Body 14px with `tabular-nums`.
- **Guards** (`frontend/src/app/style-guard.test.ts`): fail on a size outside the scale, `uppercase`, " · " outside the document-title files (`usePageTitle.ts`, `ReportsPage.tsx`), and `underline` outside the `prose-link` utility (a dotted hint underline is allowed). `prose-link` is a Tailwind 4 `@utility`, because `[&_a]:prose-link` in alert.tsx needs one.
- **StateGlyph** (`components/StateGlyph.tsx`): hollow ready, half in progress, full done, knot blocked, dashed deferred; the svg is `aria-hidden`, so a caller that names a state by the glyph alone wraps it in `role="img"`. No coloured left edge on cards or nodes any more.
- **Strand** (`components/Strand.tsx`): beads up to 16 items, segments above, and segments whenever the beads do not fit its `maxWidth` (Graph node 72, lane box 96, Lanes header 56, large strand 280, Gantt label `strandCapOf(label)`: 56 in the 168 px phone column, 96 from 300 px). `role="img"` with "<d> done, … of <t> <noun>", `data-strand="d/t"`, a 1px floor per present state. `toStrandCounts` derives Ready and clamps.
- **Counts by state**: `child_counts` has eight keys (`in_progress`, `blocked`, `ready`, `deferred` added; `track_state` classes a track as the Board does); the Milestones list `epics` gains the same four from the milestone bead's children in the Beads snapshot, after the 5 s list cache; a missing bead or a `BeadsError` falls back to `ready = total - closed`.
- **Gantt**: one `[data-bar=<epic>]` per epic (no per-day `[data-bead]`), `overflow-hidden` with a `[data-overflow]` hatch past the end (card-coloured stripes on a blocked bar), one `[data-verdict]` per row from `verdictOf` (severity order, knot for late and external_blocker, "+n", tooltip lines through `whitespace-pre-line`), rows of 72 px from lg. The label's strand group is `shrink-0`; the period, estimate and id truncate first; below lg the group wraps "Prep d/t" onto its own line.
- **Data as text**: no feature renders `<Badge>`; `badge.tsx` stays for controls. P0/P1 bold, type only "bug" in carnelian on rows, lane = dot + name (muted except in the Tracks table, which knows the lane slots).

**Consequences**
- jsdom cannot see width problems: the strand count was cut on the Gantt at 1440 and then at 390 and only the Playwright TC-1 on the deployed build found it (three runs). Check layout changes on the Tailscale build at 390, 1440 and 1920.
- e2e specs can depend on UI details their cases never mention, so `gin-qa e2e plan` does not mark them stale; a full `gin-qa e2e run` over the touched capabilities found 14 such specs (per-day pills, "1 of 4", the old Progress card).
- The wider Recursive face made chart day labels collide; `team/axisLabels.ts` `placeAxisLabels` drops labels that would overlap (7.5 px per character estimate).
- In zsh, an unquoted `grep --include=*.tsx` fails the glob and prints nothing; quote it in acceptance checks.
- The removable filter chips and the one-line filter bar belong to gin-console-rm-beads-views; REQ-UI-140's scenario checks the filter count pill instead.

**References**
- Change: `docs/changes/archive/2026-11-22-gin-console-rm-strung-strung/`; diagrams `docs/specs/ui/diagrams/strand-activity.md`, `docs/specs/milestone-ui/diagrams/gantt-verdict-activity.md`; use case `docs/specs/milestone-ui/use-cases/read-gantt-verdict.md`.
- Evidence: TC-1 `qa/evidence/2026-11-22-strung-tc1-run3/` (625/625); e2e runs `qa/evidence/2026-11-22T16-37-01`, `2026-11-22T16-49-44`, `2026-11-22T16-53-53`; api `qa/evidence/2026-11-22T16-49-57-api`.
- Beads: gin-console-rm-strung.1 to .14 (bugs .12 to .14).

**Scope**
gin-console frontend (every page), `beads/definitions.py`, the milestones API, QA cases and e2e specs of ui, milestone-ui, reports and beads, the example data generator.

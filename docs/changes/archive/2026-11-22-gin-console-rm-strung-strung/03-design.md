# Design: Strung visual system

Epic: gin-console-rm-strung

## Architecture

The epic restyles the existing pages through the shared tokens and two shared components. Layout stays as it is.

**Tokens (`frontend/src/index.css`).**
- The semantic token names stay, so the 22 files that use `text-state-*`, `bg-state-*` and `border-state-*` keep their classes. They take the Strung values for light (`:root`) and dark (`.dark`):
  - `--background` takes porcelain; `--card`, `--popover` and `--sidebar` take paper.
  - `--muted`, `--secondary` and `--accent` take sunk; `--border` takes rule.
  - `--foreground` takes graphite; `--muted-foreground` takes slate.
  - `--primary` and `--ring` take amethyst.
  - `--state-ready` and `--state-done` take jade, `--state-progress` lapis, `--state-blocked` amber, `--state-deferred` hematite.
  - `--destructive` and `--type-bug` take carnelian.
- New: `--identity` and `--identity-wash` (amethyst and its wash), exposed as `--color-identity*`.
- Removed: `--type-epic`, `--type-feature` and the unused `--chart-1..5`. `--lane-*` and `--series-*` are unchanged.
- The `.markdown a` rule moves from `--state-progress` to graphite with an underline in amethyst at half strength (REQ-UI-139).

**Typeface and scale.**
- `@fontsource-variable/recursive/mono.css` replaces the two Geist imports.
- `--font-sans` and `--font-mono` both name Recursive; `.font-mono` adds `font-variation-settings: "MONO" 1`.
- The Tailwind `--text-*` theme is reset to the seven sizes, each with its line height, so a size outside the scale has no class.
- `body` gets `tabular-nums`. The plan maps today's classes (`text-sm` 137 uses, `text-xs` 95, `text-xl` 8, `text-base` 6, `text-2xl` 6, `text-lg` 3, and 6 arbitrary sizes) onto the scale by role.

**Components (`frontend/src/components/`).**
- `StateGlyph({ state, size })` is an SVG of the five shapes of REQ-UI-064.
  - `StateMark` (beads) and `MilestoneStatus` (milestones) draw it in place of the lucide icons.
  - `stateEdge` and its 4px borders go.
- `Strand({ counts, noun, size })` draws beads up to 16 items and segments above. It sits on a thread in `--border`, followed by "done/total" or, at `size="lg"`, the sentence. It carries `role="img"`, the accessible name and the `Hint` tooltip.
  - It replaces `ProgressBar.tsx` (deleted), the bar in `ListRow`, the bar in `MilestonesPage` `Row`, the stacked bar of `ProgressCard`, the `ScopeBar` of `TeamFigures`, the "d of t done" of `GanttChart`, and the closed counts of the lane headers (`laneGraph.ts`, `LaneSummary`).
  - `progress.ts` `progressOf` returns the five counts.
- `Verdict({ warnings })` is the one Gantt line of REQ-MILESTONE-UI-024. `gantt.ts` gains `verdictOf(epic)`, which orders `warningLines` by severity. The `WARNING_HEIGHT` growth of `rowsOf` goes.
- The Gantt `LOOK` map draws one bar per epic from `xOf(first day)` to `endOf(last day)`, with a hatched amber part after the milestone end.

**Text and chips.**
- `PriorityPill`, `TypeBadge`, `SizeBadge`, `KindBadge`, `PrepChip`, `LaneChip` and `CountBadge` keep their names and props and render plain text, which keeps their call sites stable (REQ-UI-140).
- `badge.tsx` stays for the filter chips and other controls.
- The " · " joins, the `uppercase` classes and the underline classes listed in the inventory are rewritten in place (REQ-UI-139).

**Shell.**
- `Layout.tsx` draws the brand mark and the identity bar of the current item. `ProjectSwitcher`, `Tabs` and the selected-row styles use `--identity*`.

**Backend.**
- `beads/definitions.py` `Counts` and `child_counts` gain `in_progress`, `blocked`, `ready` and `deferred`, classing each open track as the Board does (`is_blocked` first, then status `deferred`, then ready, then `in_progress`, else deferred). `ChildCounts` in `beads/models.py` follows.
- `milestones/models.py` `EpicCount` gains the same four counts. The milestones router fills them from the project's Beads snapshot, as the `child_counts` of the milestone bead, keeping `total` and `closed` from `gin milestone list`. The snapshot store is injected into `create_app` like the other sources.

## Data Flow

- `docs/specs/ui/diagrams/strand-activity.md`: from `child_counts` or `epics` to beads, segments or nothing, with the count and the accessible name.
- `docs/specs/milestone-ui/diagrams/gantt-verdict-activity.md`: from an epic's warnings to no verdict, one verdict, or one verdict with "+n" and the tooltip (use case `read-gantt-verdict`).
- `docs/specs/beads/diagrams/bead-state.md` (unchanged) gives the state a track is counted in.

## Error Handling

- Counts that do not add up: `Strand` clamps each count at 0 and takes Ready as what remains, so an inconsistent Milestones entry never draws a negative segment.
- Milestone bead missing from the Beads export, or the snapshot unreadable: the Milestones list still answers, with the four counts at 0 and Ready as `total - closed` (REQ-MILESTONE-UI-025). The list's own `error` path is unchanged.
- Unknown warning code: it is ordered last and written as the code (REQ-MILESTONE-UI-003).
- Font not loaded yet: `font-display: swap` draws the system font first. Ids stay monospace through the `ui-monospace` fallback.

## Testing

- **Backend (pytest):**
  - `child_counts` by state, including blocked in progress, deferred and ready, prep and merge gates left out (REQ-BEADS-022).
  - The milestones list counts with and without the milestone bead (REQ-MILESTONE-UI-025), using `fake_bd.py` and the gin-workflow fake.
- **Frontend (vitest):**
  - `StateGlyph` shapes per state (REQ-UI-064).
  - `Strand`: 7 beads in order, more than 16, none, prep apart, the large sentence, the accessible name (REQ-UI-138).
  - `verdictOf` severity, "+n" and tooltip lines (REQ-MILESTONE-UI-024).
  - The Gantt bar as one element per epic, hatched past the end (REQ-MILESTONE-UI-003).
  - Row, card and node content tests updated for text instead of pills.
- **Tokens:** `tokens.test.ts` reads the new names and values, checks text and colours at 4.5:1 and glyph strokes and control outlines at 3:1 on porcelain, paper and sunk, in both themes (REQ-UI-059).
- **Guard (vitest, `src/app/style-guard.test.ts`):** reads every `.ts` and `.tsx` source except tests and fails on:
  - a `text-` size class outside the scale or an arbitrary `text-[…]` size;
  - `uppercase`;
  - " · " outside `usePageTitle.ts`;
  - `underline` outside the prose-link class.
  It covers REQ-UI-137 and REQ-UI-139.
- **Manual (TC-1, run by Claude with Playwright on the Tailscale build):**
  - Every page of the `example` project at 1440px and 390px in both themes, with screenshots.
  - The font family and `MONO` of an id, sizes of a title, a row and a date.
  - Glyphs, strands, one verdict per Gantt row, no data pill, no " · ", no underlined navigation, the identity marks.
  - `scripts/make_example_project.py` gains an epic with more than 16 tracks and an epic with four warnings.

## Risks

- Every screen changes at once, and the epic touches `ListRow` and the Board cards that gin-console-rm-beads-views will change next. Land tokens and components first, then page by page, and run the readability check of REQ-UI-110 at the end.
- Smaller base text (14px) and denser rows can push long ids and titles; the long-text sweep of `qa/evidence/2026-11-15-21h-tc1-run2/sweep2.js` reruns in TC-1.
- `text-sm` moves from 14px to 13px if the Tailwind names are kept, so the plan must map classes by role rather than rename blindly.

## Open Technical Questions

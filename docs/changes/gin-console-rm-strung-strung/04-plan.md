# Plan: Strung visual system

Epic: gin-console-rm-strung
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.
- Diagrams: `docs/specs/ui/diagrams/strand-activity.md`, `docs/specs/milestone-ui/diagrams/gantt-verdict-activity.md`.
- Use case: `docs/specs/milestone-ui/use-cases/read-gantt-verdict.md`.
- Asset: `docs/specs/ui/assets/2026-11-22/` (`index.html` holds a reference `glyph()` and `strand()` in plain JS at lines 662-720).

## Objective
gin-console gets one identity colour, a real type scale and one way to draw state and progress:
- **Palette:** Strung values in light and dark; amethyst marks where you are.
- **Type:** Recursive (Sans and Mono voices) on a 12/13/14/16/20/28/40 scale with tabular figures.
- **State:** five glyphs (hollow, half, full, knot, dashed) on every page; no coloured state edge.
- **Progress:** one `Strand` everywhere, fed by counts by state from the API.
- **Gantt:** one continuous bar per epic and one verdict per row.
- **Quiet text:** no pills for data, no capitals by style, no " · " in page text, no underlined navigation.

Done when:
- Every scenario of the 8 added and 32 modified REQs of `02-spec-delta.md` has a test that names its REQ.
- `gin-qa cases check --change gin-console-rm-strung` prints `ok`.
- TC-1 passes on the deployed console.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:**
  - **No identity:** current place, primary action and focus are near-black (`index.css:87` `--ring: #12161c`).
  - **Flat type:** page titles are `text-xl` (20px) on 8 pages, rows `text-sm`, meta `text-xs`; 6 arbitrary sizes (`text-[11px]` ×4, `text-[10px]`, `text-[0.8rem]`).
  - **Teal means two things:** the Team `ScopeBar` draws closed beads with `bg-state-ready` (`TeamFigures.tsx:73-78`); Done is grey elsewhere (`--state-done: #5d6573`).
  - **Five progress drawings:**
    - `ProgressBar.tsx` (via `BeadBody.tsx:31`)
    - `ListRow.tsx:95-106`
    - `ProgressCard.tsx:36-52`
    - `MilestonesPage.tsx:155-168`
    - `TeamFigures.tsx:71-102`

    They are written four ways ("3/5 closed", "3 of 5 done", "4 of 8 tracks closed · 50%", "2 of 6").
  - **Gantt:** one pill per working day (`GanttChart.tsx:500-505`) and one line per warning (`:484-489`, `gantt.ts:253` adds `WARNING_HEIGHT` per line).
  - **Chips:**
    - `PriorityPill`, `TypeBadge`, `SizeBadge`, `KindBadge`, `PrepChip`, `LaneChip` and `CountBadge` draw pills on rows, cards, nodes and the bead header.
    - `ProjectCard` and the Team `BeadTable` add their own badges.
  - **Text:**
    - `uppercase` at 10 sites.
    - " · " in about 20 visible strings.
    - Underlined navigation at about 25 sites.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-rm-strung --against master` prints `ok`, and `gin specs trace --change gin-console-rm-strung` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions of 2026-11-22):
  - **Tokens:**
    - Semantic names stay (`--state-*`, `--primary`, `--destructive`, `--ring`, `--background`, `--card`, `--muted`, …) with Strung values.
    - New: `--identity` and `--identity-wash`.
    - Removed: `--type-epic`, `--type-feature`, `--chart-1..5`.
    - Unchanged: `--lane-*` and `--series-*`.
  - **Font:** `@fontsource-variable/recursive/mono.css` only (MONO and wght axes); no Geist; no Casual axis.
  - **Scale:**
    - Only 12, 13, 14, 16, 20, 28, 40px, as `text-xs` 12, `text-13` 13, `text-sm` 14, `text-base` 16, `text-xl` 20, `text-2xl` 28, `text-4xl` 40.
    - `text-lg`, `text-3xl`, `text-5xl` and larger are unset.
    - The body is 14px with `tabular-nums`.
  - **Glyphs:** ready hollow, in progress right half filled, done full, blocked full with a bar in the surface colour, deferred dashed.
    - Milestone: planned→deferred, scheduled→ready, active→in progress, closed→done.
  - **Strand:**
    - Order Done, In progress, Blocked, Ready, Deferred.
    - Beads up to 16, segments above.
    - "done/total" after it; `role="img"` with the sentence "<n> done, … of <total> <noun>".
    - Nothing when the total is 0.
    - Prep apart as "Prep d/t".
    - Large size on the epic Progress card with the visible sentence.
  - **Counts by state:**
    - A track that is not closed is blocked when `is_blocked`, else deferred when its status is `deferred`, else ready when in `snapshot.ready`, else in progress when its status is `in_progress` or `hooked`, else deferred.
    - The frontend treats missing fields as 0 and takes Ready as what remains, clamped at 0.
  - **Verdict:**
    - Severity `late`, `overflow`, `external_blocker`, `after_integration`, `oversized`, `open_bugs`, `spec_due`, `spec_not_ready`, `unestimated`, then unknown codes.
    - The knot glyph for `late` and `external_blocker`, a dashed ring otherwise, both in amber.
    - "+n" after it; a tooltip with every line.
    - Rows of one fixed height.
  - **Data as text:** pills only for controls.
    - P0 and P1 are bold in the text colour; the others are muted.
    - Rows show the type only for bugs ("bug" in carnelian).
    - The lane dot is muted except in the Tracks table.
  - **Text:** no `uppercase` (initials via `.toUpperCase()`); no " · " except `usePageTitle.ts` and the `ReportsPage` title; no underline on navigation; links in sentences are underlined in amethyst at 50%.
  - **Read-only:** the console mutates nothing.
  - **Dependencies:** `@fontsource-variable/recursive` is the only new dependency; `@fontsource-variable/geist` and `geist-mono` are removed.
- **Non-goals:**
  - Layout changes beyond the shell.
  - The one-line filter bar and the click rule (gin-console-rm-beads-views).
  - The Reports status page.
  - The Casual axis.
  - gin-workflow JSON.

## Approach Options
### Option 1: Semantic tokens plus two shared components, then pages by concern
- **Summary:**
  - Backend counts first.
  - Then tokens and type.
  - Then `StateGlyph`, then `Strand` in the Beads views, then in Milestones and Reports.
  - Then the Gantt.
  - Then data as text, plain text with the guard test, and the identity in the shell.
- **Pros:**
  - Each concern is one reviewable track with its own tests.
  - Call sites stay stable, because the chip components keep their names and props.
- **Cons:**
  - Eleven tracks.
  - `ListRow.tsx`, `BeadCard.tsx`, `GraphNode.tsx` and `GanttChart.tsx` are edited by several tracks in turn.

### Option 2: Page by page
- **Summary:** each track restyles one page completely.
- **Pros:** a finished page after each track.
- **Cons:**
  - The glyph, strand and chip rules are written once per page and drift.
  - The design rejected it.

### Recommended Approach
- **Selected option:** Option 1, the approach the user chose in discuss.
- **Rationale:** the glyph, the strand and the verdict are the rules reviewers must check, so each lives in one component with one test file. The page edits are then small and mechanical.

## Scope
- **In scope:**
  - The 8 added and 32 modified REQs of `02-spec-delta.md`.
  - Their gin-qa cases and e2e specs.
  - The example data TC-1 needs.
  - TC-1.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane (roadmap AI capacity 1); the frontend tracks edit the same row, card, node, header and Gantt files in turn, so they run in order on feat/strung-visual-system.
```

## Tasks
### Track 1: Counts by state in the APIs
- **Dependencies**: none
- **Requirements**: REQ-BEADS-022, REQ-MILESTONE-UI-025
- **Files**:
  - Modify `backend/src/gin_console/beads/definitions.py:26-51` (`Counts` fields, `track_state`, `child_counts`)
  - Modify `backend/src/gin_console/beads/models.py:36-41` (`ChildCounts` fields)
  - Modify `backend/src/gin_console/milestones/models.py:17-19` (`EpicCount` fields)
  - Modify `backend/src/gin_console/milestones/source.py:58-63` (add `with_epic_states`)
  - Modify `backend/src/gin_console/milestones/router.py:22-48` (`snapshots` parameter, enrich the list)
  - Modify `backend/src/gin_console/app.py:90` (pass `snapshots`)
  - Modify `frontend/src/features/beads/api.ts:9,92-93` (`ChildCounts` optional fields and guard)
  - Modify `frontend/src/features/milestones/api.ts:24,153-155` (`epics` optional fields and guard)
  - Test `backend/tests/test_beads_definitions.py`
  - Test `backend/tests/test_beads_source.py:479,491`
  - Test `backend/tests/test_definitions_api.py:66,82,89`
  - Test `backend/tests/test_milestones_api.py:57`
  - Test `backend/tests/test_milestones_source.py`
  - Test `frontend/src/features/beads/api.test.ts`
  - Test `frontend/src/features/milestones/api.test.ts`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one classification function with listed edge cases, one pure enrichment function and one injected dependency.
- **Acceptance criteria**:
  - The scenarios of REQ-BEADS-022 (including "Counts by state") and REQ-MILESTONE-UI-025 have tests named for them.
  - Existing exact-dict assertions are updated to the eight keys.
  - The frontend guards accept payloads with and without the new keys.
  - Backend `pytest`, `ruff check .` and `mypy` pass; frontend `test --run` and `typecheck` pass.
- **Estimated complexity**: medium

Interfaces produced:
- `beads/definitions.py`:
  - `@dataclass(frozen=True) class Counts`: `total`, `closed`, `prep_total`, `prep_closed`, `in_progress`, `blocked`, `ready`, `deferred`, all `int = 0`, in that order. Positional `Counts(3, 2, 1, 1)` keeps its meaning.
  - `track_state(ident: str, row: Mapping[str, Any], snapshot: Snapshot) -> Literal["done", "blocked", "deferred", "ready", "in_progress"]`:
    - `done` if `is_done(row)`;
    - `blocked` if `is_blocked(ident, row, snapshot)`;
    - `deferred` if status `deferred`;
    - `ready` if `ident in snapshot.ready`;
    - `in_progress` if status is `in_progress` or `hooked`;
    - else `deferred`.
  - `child_counts`: for a track child that is not done, increments the field named by `track_state`; prep and gate handling unchanged.
- `beads/models.py` `ChildCounts`: adds `in_progress`, `blocked`, `ready` and `deferred`, each `int = 0`; it stays `strict`.
- `milestones/models.py` `EpicCount`: adds the same four as `int = 0`.
- `milestones/source.py` `with_epic_states(listing: MilestoneList, snapshot: Snapshot | None) -> MilestoneList`. For each entry:
  - when `snapshot` has the milestone bead, it copies the four counts from `child_counts(snapshot).get(entry.id, Counts())`;
  - otherwise it sets them to 0 and `ready = max(total - closed, 0)`;
  - `total` and `closed` are never changed;
  - it returns a new `MilestoneList` with `model_copy(update=…)`.
- `milestones/router.py` `build_router(settings, run, clock, on_refresh, snapshots: SnapshotStore)`:
  - `get_milestones` reads the cached list, then `snapshot = snapshots.get(cwd)`, catching `BeadsError` as `None`;
  - it returns `with_epic_states(listing, snapshot)`. The enrichment is not cached; the snapshot store has its own cache.
- Frontend:
  - `ChildCounts` gains `in_progress?: number; blocked?: number; ready?: number; deferred?: number`.
  - `isChildCounts` checks each present one with `isFiniteNumber`.
  - `MilestoneEntry.epics` gains the same four optional numbers, checked the same way in `isEntry`.

Steps:
1. In `test_beads_definitions.py`, add `test_beads_022_counts_by_state` (`# REQ-BEADS-022`):
   - Epic `e-2` has the tracks:
     - `t-1` closed;
     - `t-2` `in_progress`;
     - `t-3` `in_progress` and blocked by open `x`;
     - `t-4` open;
     - `t-5` `deferred`;
     - `t-6` `hooked`.
   - Expect `Counts(total=6, closed=1, in_progress=2, blocked=1, ready=1, deferred=1)`.
   - Add a `track_state` table test: a status-`blocked` bead without blocker → `blocked`; an open bead that is neither ready nor blocked (child of a blocked epic) → `blocked`.
   - Run `uv run --directory backend pytest tests/test_beads_definitions.py`: it fails.
2. Add the fields and `track_state` to `definitions.py`, and increment the counts in `child_counts`. Run the test again: it passes.
3. Update the exact dicts at `test_beads_source.py:479,491` and `test_definitions_api.py:66,82,89` to the eight keys. Add the "Counts by state" scenario as an API test in `test_definitions_api.py` (`GET /api/beads?project=`). Add the fields to `ChildCounts`. Run `uv run --directory backend pytest tests/test_beads_source.py tests/test_definitions_api.py`: it passes.
4. In `test_milestones_source.py`, add two tests, each with the comment `# REQ-MILESTONE-UI-025`:
   - `test_milestone_ui_025_counts_by_state`: a `MilestoneList` built from `fake_gw.LIST` with entry `gw-ab1` `{total: 4, closed: 1}`, and a snapshot from `build_snapshot` in which bead `gw-ab1` (type `milestone`) has the epics:
     - `e-1` closed;
     - `e-2` `in_progress`;
     - `e-3` open, blocked by open `x`;
     - `e-4` open.

     Expect `{total: 4, closed: 1, in_progress: 1, blocked: 1, ready: 1, deferred: 0}`.
   - `test_milestone_ui_025_bead_missing`: `snapshot=None` gives `ready: 3` and the others 0.

   Run them: they fail.
5. Add the fields to `EpicCount`, write `with_epic_states`, and give `build_router` the `snapshots` parameter. Pass `snapshots` at `app.py:90`. Update `test_milestones_api.py:57` to the six keys. Add `test_milestone_ui_025_snapshot_unreadable` (`create_app` with a `read_beads` that raises `BeadsError`): the list still answers 200 with `ready = total - closed`. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy`: all pass.
6. Frontend: extend the two types and guards. Add `# REQ-BEADS-022` and `# REQ-MILESTONE-UI-025` guard tests: payloads with and without the new keys pass; a string value fails. Run `pnpm -C frontend test --run src/features/beads/api.test.ts src/features/milestones/api.test.ts` and `pnpm -C frontend typecheck`: both pass.
7. Commit: `git commit -m "feat(beads): child and milestone epic counts by state (gin-console-rm-strung)"`

### Track 2: Strung tokens, typeface and type scale
- **Dependencies**: none
- **Requirements**: REQ-UI-059, REQ-UI-136, REQ-UI-137
- **Files**:
  - Modify `frontend/package.json`, `frontend/pnpm-lock.yaml` (add `@fontsource-variable/recursive`, remove the two Geist packages)
  - Modify `frontend/src/index.css:1-5` (imports), `:9-63` (`@theme inline`: fonts, text sizes, identity colours, chart removal), `:65-183` (`:root` and `.dark` values), `:185-200` (body size and figures, `.font-mono` voice)
  - Modify the h1 of `frontend/src/features/milestones/MilestonesPage.tsx:57`, `frontend/src/features/reports/ReportsPage.tsx:207`, `frontend/src/features/projects/ProjectsPage.tsx:54`, `frontend/src/features/milestones/MilestonePage.tsx:135`, `frontend/src/features/beads/BeadsPage.tsx:64`, `frontend/src/features/beads/BeadHeader.tsx:41`, `frontend/src/features/my-tasks/MyTasksPage.tsx:73`, `frontend/src/app/NotFoundPage.tsx:12` and `frontend/src/app/LoginPage.tsx:16` (`text-xl`/`text-lg` → `text-2xl`)
  - Modify off-scale sizes:
    - `frontend/src/features/beads/MilestoneCard.tsx:32` (`text-lg` → `text-xl`)
    - `frontend/src/features/milestones/ForecastCard.tsx:42` (`text-lg` → `text-base`)
    - `frontend/src/features/milestones/GanttChart.tsx:310,327,331` and `frontend/src/app/Layout.tsx:36` (`text-[11px]` → `text-xs`)
    - `frontend/src/features/beads/GraphCanvas.tsx:82` (`text-[10px]` → `text-xs`)
    - `frontend/src/components/ui/button.tsx:25` (`text-[0.8rem]` → `text-13`)
  - Modify the 13px roles (`text-sm`/`text-xs` → `text-13`):
    - filter controls: `frontend/src/features/beads/FilterSelect.tsx:16`, `frontend/src/features/beads/BeadFilterBar.tsx:59,136`, `frontend/src/features/beads/MilestoneFilter.tsx:33`, `frontend/src/features/beads/MultiSelectPopover.tsx:39,53,71,78`;
    - the button base `frontend/src/components/ui/button.tsx:6`;
    - every `font-mono text-xs` id (`grep -rn "font-mono" frontend/src --include=*.tsx | grep text-xs`).
  - Modify `frontend/src/app/tokens.test.ts`
  - Create `frontend/src/app/style-guard.test.ts`
  - Test `frontend/src/features/milestones/ForecastCard.test.tsx:57`, `frontend/src/features/reports/team/TeamFigures.test.tsx:29` (their `text-2xl` selectors keep working; adjust only if they fail)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** token values are given; the size mapping is a table of roles with exact sites, and a guard test checks it.
- **Acceptance criteria**:
  - `tokens.test.ts` checks the exact light and dark values of REQ-UI-059 and the contrast rules in both themes.
  - `style-guard.test.ts` fails on a size class outside the scale.
  - `pnpm -C frontend build` emits no Geist file, and the built CSS names Recursive.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Token values (light / dark), for `:root` / `.dark`:

| Token | Light | Dark |
|---|---|---|
| `--background` | `#F4F5F8` | `#12131A` |
| `--card`, `--popover`, `--sidebar` | `#FFFFFF` | `#1B1C25` |
| `--muted`, `--secondary`, `--accent`, `--sidebar-accent` | `#ECEEF3` | `#242632` |
| `--border`, `--sidebar-border` | `#DDE0E7` | `#2E303D` |
| `--foreground` and every `*-foreground` except `--muted-foreground` and `--primary-foreground` | `#1B1D26` | `#E8E9F0` |
| `--muted-foreground` | `#596072` | `#A0A5B5` |
| `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--identity` | `#6A3DB8` | `#B89EF6` |
| `--primary-foreground`, `--sidebar-primary-foreground` | `#FFFFFF` | `#12131A` |
| `--identity-wash` | `#EFE9FA` | `#2A2342` |
| `--input` | `#7D8695` | `#757B8C` |
| `--state-ready`, `--state-done` | `#0E7A5C` | `#45CF9F` |
| `--state-progress` | `#2557D6` | `#93B1FF` |
| `--state-blocked` | `#AE500A` | `#F2A54C` |
| `--state-deferred` | `#646A78` | `#9298A6` |
| `--destructive`, `--type-bug` | `#B42318` | `#FF8A7A` |

Measured contrast (WCAG):
- Light: the lowest state colour is 4.57:1 on sunk; `--input` is 3.16:1.
- Dark: the lowest is hematite at 5.19:1 on sunk; `--input` is 3.55:1.

Interfaces produced (CSS):
- `@theme inline`:
  - `--font-sans` and `--font-mono` are both `'Recursive Variable', system-ui, sans-serif` / `'Recursive Variable', ui-monospace, monospace`;
  - `--text-13: 13px` with `--text-13--line-height: 1.4`;
  - `--text-2xl: 28px` with line height `1.15`;
  - `--text-4xl: 40px` with line height `1.05`;
  - `--text-lg`, `--text-3xl`, `--text-5xl` … `--text-9xl` are `initial`;
  - `--color-identity: var(--identity)` and `--color-identity-wash: var(--identity-wash)`;
  - no `--color-chart-*`, `--color-type-epic` or `--color-type-feature`.
- `@layer base`:
  - `body { font-size: 14px; font-variant-numeric: tabular-nums; font-variation-settings: "MONO" 0; }`;
  - `.font-mono { font-variation-settings: "MONO" 1; }`.
- `.markdown code` and `.markdown table` use `13px` in place of `0.875em`/`0.875rem`.

Steps:
1. Rewrite `tokens.test.ts`:
   - `SURFACES = ["background", "card", "muted"]`; `TYPES = ["type-bug"]`; add `identity` to the defined tokens.
   - `REQ-UI-059 light values` and `REQ-UI-059 dark values` assert the hex of the table for porcelain, paper, sunk, rule, graphite, slate, amethyst, jade, lapis, amber, hematite and carnelian (the tokens of the table's first column).
   - Keep the contrast loop with `identity` added to the 4.5:1 set. Add `input` at 3:1 against the three surfaces.
   - Assert `--state-done` equals `--state-ready` in each theme ("Done is jade").
   - Run `pnpm -C frontend test --run src/app/tokens.test.ts`: it fails.
2. Edit `index.css` per the table and interfaces. Run the test again: it passes.
3. Run `pnpm -C frontend add @fontsource-variable/recursive@^5.3.0` and `pnpm -C frontend remove @fontsource-variable/geist @fontsource-variable/geist-mono`. In `index.css`, replace the two Geist imports with `@import "@fontsource-variable/recursive/mono.css";`.
4. Create `style-guard.test.ts` (`// REQ-UI-137`):
   - It reads every `.ts`/`.tsx` under `src` except `*.test.*` with `node:fs`.
   - It fails, listing `file:line`, on:
     - `/\btext-(lg|3xl|[5-9]xl)\b/`;
     - `/\btext-\[\d/` (arbitrary sizes);
     - `/fontSize:\s*["']?(?!1[2346]px|20px|28px|40px)/` in style objects.
   - Run it: it fails on the sites listed under Files.
5. Apply the class changes listed under Files. Run the guard again: it passes.
6. Add a `// REQ-UI-136` test to `style-guard.test.ts` that reads `index.css` and asserts:
   - the Recursive import exists;
   - no `geist` string remains;
   - `.font-mono` sets `"MONO" 1`.

   Add a `// REQ-UI-137` test that asserts the body sets `tabular-nums` and 14px.
7. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`; then `ls frontend/dist/assets | grep -ci geist` prints `0`. Fix tests that asserted the old h1 class (`text-xl`) by asserting `text-2xl`.
8. Commit: `git commit -m "feat(ui): Strung palette, Recursive and the type scale (gin-console-rm-strung)"`

### Track 3: State glyphs
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-064, REQ-UI-049, REQ-UI-065
- **Files**:
  - Create `frontend/src/components/StateGlyph.tsx`
  - Create `frontend/src/components/StateGlyph.test.tsx`
  - Modify `frontend/src/features/beads/StateMark.tsx:10,25-34,37-63` (glyph in place of `ICON`; remove `EDGE` and `stateEdge`)
  - Modify `frontend/src/features/beads/BeadCard.tsx:18` (no `stateEdge`)
  - Modify `frontend/src/features/beads/GraphNode.tsx:49` (no `stateEdge`)
  - Modify `frontend/src/features/milestones/MilestoneStatus.tsx:4-23` (glyph per status)
  - Modify `frontend/src/features/milestones/GanttChart.tsx:58-72,437,~533` (`LOOK` gains `glyph`; row and child icons become `StateGlyph`)
  - Test `frontend/src/features/beads/StateMark.test.tsx:31-32`, `frontend/src/features/beads/BeadCard.test.tsx:50`, `frontend/src/features/beads/GraphNode.test.tsx`, `frontend/src/components/Legend.test.tsx:10`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one SVG component with five fixed shapes and a mechanical swap at known call sites.
- **Acceptance criteria**:
  - Each REQ-UI-064 scenario has a test: blocked card without edge, same glyph across views, five distinct shapes, milestone status glyphs.
  - `data-state` and `data-status` stay on the wrappers.
  - `pnpm -C frontend test --run`, `typecheck` and `lint` pass.
- **Estimated complexity**: low

Interfaces produced (`components/StateGlyph.tsx`):
- `export type GlyphState = "ready" | "in_progress" | "blocked" | "done" | "deferred"` (the same union as `GraphState`).
- `export const GLYPH_COLOR: Record<GlyphState, string>`: `var(--state-ready)`, `var(--state-progress)`, `var(--state-blocked)`, `var(--state-done)`, `var(--state-deferred)`.
- `export function glyphShape(state: GlyphState, cx: number, cy: number, r: number, color: string): ReactElement` returns a `<g data-shape={state}>`. With stroke width 1.8:
  - ready: `circle` with `fill="none"` and the stroke;
  - in_progress: the stroked circle plus `path d={`M${cx} ${cy - r}a${r} ${r} 0 0 1 0 ${2 * r}z`}` filled;
  - done: `circle r={r + 0.9}` filled;
  - blocked: the filled circle plus `path d={`M${cx - r * 0.55} ${cy}h${r * 1.1}`}` with `stroke="var(--card)"`, `strokeWidth={2}` and `strokeLinecap="round"`;
  - deferred: the stroked circle with `strokeDasharray="2.2 2.2"`.
- `export function StateGlyph({ state, size = 12, color, className }: { state: GlyphState; size?: number; color?: string; className?: string })`:
  - It renders `<svg data-glyph={state} aria-hidden width={size + 4} height={size + 4} viewBox={`0 0 ${size + 4} ${size + 4}`} className={className}>{glyphShape(state, m, m, size / 2, color ?? GLYPH_COLOR[state])}</svg>`, with `m = (size + 4) / 2`.
- `MilestoneStatus`: `MARK` becomes `{ planned: "deferred", scheduled: "ready", active: "in_progress", closed: "done" }` with labels. An unknown status draws `deferred` in `var(--muted-foreground)`.
- Gantt `LOOK`: each entry gains `glyph: GlyphState` (`open: "ready"`, `closed: "done"`); `icon` is removed.

Steps:
1. Write `StateGlyph.test.tsx` (`// REQ-UI-064`): for each state, the rendered `g[data-shape]` has the expected children:
   - ready: one circle, `fill="none"`;
   - in_progress: a circle and a path;
   - done: one filled circle;
   - blocked: a circle and a path stroked `var(--card)`;
   - deferred: a circle with `stroke-dasharray`.

   A `color` prop overrides the colour. Run it: it fails.
2. Write `StateGlyph.tsx`. Run the test again: it passes.
3. Update the tests that pin the old look, each with a `// REQ-UI-064` comment:
   - `StateMark.test.tsx`: drop the `stateEdge` test and assert `svg[data-glyph="blocked"]` inside `[data-state="blocked"]`.
   - `BeadCard.test.tsx:50`: the card has no class starting `border-l-`.
   - `GraphNode.test.tsx`: the node has no `border-l-4`.
   - `MilestoneStatus` (in `StateMark.test.tsx:60`): `active` draws `svg[data-glyph="in_progress"]` and the word "Active".
   - `Legend.test.tsx:10`: five `svg[data-glyph]`.

   Run them: they fail.
4. Swap the icons for `StateGlyph` in `StateMark`, `StateWord`, `MilestoneStatus` and the Gantt rows. Remove `stateEdge` and its uses. Run `pnpm -C frontend test --run`, `typecheck` and `lint`: they pass.
5. Commit: `git commit -m "feat(ui): state glyphs replace icons and state edges (gin-console-rm-strung)"`

### Track 4: Strand in the Beads views
- **Dependencies**: Track 1, Track 3
- **Requirements**: REQ-UI-138, REQ-UI-044, REQ-UI-028, REQ-UI-049, REQ-UI-120, REQ-UI-112, REQ-UI-118, REQ-UI-121, REQ-UI-130, REQ-UI-132
- **Files**:
  - Create `frontend/src/components/Strand.tsx`
  - Create `frontend/src/components/Strand.test.tsx`
  - Modify `frontend/src/features/beads/progress.ts:3-15` (`Progress.counts`, `countsOf`)
  - Modify `frontend/src/features/beads/ListRow.tsx:95-106` (strand in place of the bar and "d/t closed")
  - Modify `frontend/src/features/beads/BeadBody.tsx:29-35` (strand in place of `ProgressBar` and "n of m closed")
  - Delete `frontend/src/components/ProgressBar.tsx`
  - Modify `frontend/src/features/beads/ProgressCard.tsx:10-52` (large strand and sentence; no `FILL` bar or legend)
  - Modify `frontend/src/features/beads/GraphNode.tsx:~86-90` and `frontend/src/features/beads/graph.ts:223,232` (node carries `counts`; strand in place of "n of m done")
  - Modify `frontend/src/features/beads/lanes.ts` (board row `tracks` gains `counts: StrandCounts`)
  - Modify `frontend/src/features/beads/laneGraph.ts:339-341` (`meta` drops the closed count; box carries `tracks`)
  - Modify `frontend/src/features/beads/LaneBox.tsx`, `frontend/src/features/beads/LanesCanvas.tsx:15,51`, `frontend/src/features/beads/LaneSummary.tsx:57` (strand)
  - Test `frontend/src/features/beads/ListView.test.tsx:221,252,267,268,283,581`, `frontend/src/features/beads/EpicPage.test.tsx:103`, `frontend/src/features/beads/EpicOverview.test.tsx`, `frontend/src/features/beads/GraphCanvas.test.tsx:43,151,165`, `frontend/src/features/beads/GraphNode.test.tsx:29`, `frontend/src/features/beads/laneGraph.test.ts:349`, `frontend/src/features/beads/LanesView.test.tsx:54,64,152`, `frontend/src/features/beads/progress.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** one component with two drawing modes and an accessible name, then many call sites whose tests pin the old texts; the segment geometry and the lane counts need care.
- **Acceptance criteria**:
  - The REQ-UI-138 scenarios (7 tracks, more than 16, none, prep apart, large strand) have tests in `Strand.test.tsx` or the view tests.
  - The modified scenarios of REQ-UI-044, -028, -049, -112, -118, -120, -121 and -130 pass with the new texts.
  - No `role="progressbar"` remains in `features/beads`.
  - `pnpm -C frontend test --run`, `typecheck` and `lint` pass.
- **Estimated complexity**: high

Interfaces produced (`components/Strand.tsx`):
- `export type StrandCounts = { done: number; inProgress: number; blocked: number; ready: number; deferred: number }`.
- `export const STRAND_ORDER = ["done", "inProgress", "blocked", "ready", "deferred"] as const`; the glyph of each is `done`, `in_progress`, `blocked`, `ready`, `deferred`.
- `export function toStrandCounts(c: { total: number; closed: number; in_progress?: number; blocked?: number; ready?: number; deferred?: number }): StrandCounts`:
  - each value is clamped at 0;
  - `ready` is `c.ready ?? max(total - closed - inProgress - blocked - deferred, 0)`.
- `export const strandTotal = (c: StrandCounts) => c.done + c.inProgress + c.blocked + c.ready + c.deferred`.
- `export function strandWords(c: StrandCounts): string`: "2 done, 1 in progress, 1 blocked, 3 ready", leaving out the zero states (and "0 done" when everything is 0).
- `export function strandSentence(c: StrandCounts, noun: "tracks" | "epics" | "beads"): string`: `${strandWords(c)} of ${strandTotal(c)} ${noun}`.
- `export function Strand({ counts, noun, size = "sm", className }: { counts: StrandCounts; noun: "tracks" | "epics" | "beads"; size?: "sm" | "lg"; className?: string }): ReactElement | null`:
  - It returns `null` when the total is 0.
  - Otherwise `<Hint text={`${strandSentence(counts, noun)}. ${DEFINITIONS.progress}`}><span role="img" aria-label={strandSentence(counts, noun)} data-strand={`${counts.done}/${total}`} className="inline-flex items-center gap-2">`, containing:
    - an `svg aria-hidden`;
    - then for `sm` `<span className="tabular-nums text-xs text-muted-foreground">{done}/{total}</span>`, for `lg` `<span className="text-sm">` with `strandWords(counts)` and the done part in `<b>`.
  - `sm`: `r = 4.5`, gap `3.5`; `lg`: `r = 9`, gap `7`.
  - Up to 16 items the svg has:
    - width `n * (2r + gap) + 6`;
    - a thread `path d={`M1 ${y}H${w - 1}`}` with `stroke="var(--border)"` and `strokeWidth={1.5}`;
    - one `glyphShape` per item in `STRAND_ORDER`, each as `g[data-bead]`.
  - Above 16 the svg has:
    - width 120 (`sm`) or 240 (`lg`);
    - one `rect[data-segment=<state>]` per non-zero state, its width proportional to the count, with a 2px gap and height `r * 1.6`;
    - filled with the state colour for done, in progress and blocked;
    - `fill="var(--card)"` with the stroke for ready, and a dashed stroke for deferred;
    - the reference is `strand()` in `docs/specs/ui/assets/2026-11-22/index.html:675-720`.
- `features/beads/progress.ts`:
  - `Progress` gains `counts: StrandCounts`, from `toStrandCounts(child_counts)`;
  - `export function countsOf(beads: readonly BeadSummary[]): StrandCounts` counts by `stateOf`, for lane tracks.
- Lanes:
  - lane board rows carry `tracks: { closed: number; total: number; counts: StrandCounts }`;
  - `LaneGraphBox` gains `tracks`;
  - `meta` keeps only the holder and the lease, joined by `", "` (REQ-UI-118).

Steps:
1. Write `Strand.test.tsx`, each case with the comment `// REQ-UI-138` and the scenario name:
   - "Epic with seven tracks": counts `{2, 1, 1, 3, 0}` → 7 `g[data-bead]` whose `data-shape` order is `done, done, in_progress, blocked, ready, ready, ready`; the text "2/7"; the accessible name "2 done, 1 in progress, 1 blocked, 3 ready of 7 tracks".
   - "More than 16 tracks": `{11, 1, 0, 6, 1}` → 4 `rect[data-segment]` whose widths are in the ratio 11:1:6:1 (±1px); the text "11/19".
   - "No track": all zero → the container is empty.
   - "Large strand": `size="lg"` → the text "4 done, 1 in progress, 1 blocked, 2 ready" and no "/".
   - `toStrandCounts({total: 5, closed: 2})` → `ready: 3`; inconsistent input never gives a negative count.

   Run `pnpm -C frontend test --run src/components/Strand.test.tsx`: it fails.
2. Write `Strand.tsx`. Run the test again: it passes.
3. Update the view tests to the new texts, each with its REQ comment:
   - `ListView.test.tsx`:
     - :221, :252 → `getByRole("img", { name: /3 done.*of 5 tracks/ })` and the text "3/5";
     - :267 → "1/2";
     - :581 → "0/2".
   - `EpicPage.test.tsx:103` → the strand `[data-strand="3/4"]` in place of `progressbar` "Children closed".
   - `EpicOverview.test.tsx` → Progress reads "4 done, 1 in progress, 1 blocked, 2 ready" and has 8 `g[data-bead]`.
   - `GraphCanvas.test.tsx:43,151,165` and `GraphNode.test.tsx:29` → "2/5", "1/3", "1/2".
   - `laneGraph.test.ts:349` → the meta of "No lane" has no count and the box has `tracks.total === 2`.
   - `LanesView.test.tsx:54,64,152` → Tracks "1/2", "0/1".

   Run them: they fail.
4. Replace the drawings at the listed sites with `<Strand counts={progress.counts} noun="tracks" />`, with these exceptions:
   - `ProgressCard` uses `size="lg"`;
   - lane boxes, `LanesCanvas` and `LaneSummary` use `countsOf(<lane tracks>)`.

   Delete `ProgressBar.tsx`. Run `pnpm -C frontend test --run`, `typecheck` and `lint`: they pass.
5. Commit: `git commit -m "feat(ui): the strand draws progress in the Beads views (gin-console-rm-strung)"`

### Track 5: Strand in Milestones and Reports
- **Dependencies**: Track 4
- **Requirements**: REQ-UI-138, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-015, REQ-REPORTS-013, REQ-UI-134, REQ-UI-130
- **Files**:
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:155-178` (strand from `epics`; warnings as a dashed amber glyph and words)
  - Modify `frontend/src/features/milestones/GanttChart.tsx:412-418,469-479` (strand in place of "d of t done"; "Prep d/t")
  - Modify `frontend/src/features/milestones/gantt.ts:231` (fallback `child_counts` stays valid with optional fields)
  - Modify `frontend/src/features/beads/progress.ts:15` (remove `prepWords`)
  - Modify `frontend/src/features/reports/team/TeamFigures.tsx:69-102,145` (`ScopeBar` becomes a strand with a glyph legend; Done "<closed> of <scope>")
  - Test `frontend/src/features/milestones/MilestonesPage.test.tsx:70,71,164-165`, `frontend/src/features/milestones/GanttChart.test.tsx:68,73-74,84,240`, `frontend/src/features/milestones/MilestonePage.test.tsx:411,525`, `frontend/src/features/reports/team/TeamFigures.test.tsx:86-90`, `frontend/src/features/beads/progress.test.ts:14-15`, `frontend/src/features/plainLabelHints.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** the component exists; three more call sites with tests that pin texts.
- **Acceptance criteria**:
  - The modified scenarios of REQ-MILESTONE-UI-001 and -015, REQ-REPORTS-013 ("Scope by status" as a strand) and REQ-UI-134 (Gantt row "5/11", "Prep 1/3") pass.
  - No `role="progressbar"` remains in `features/milestones` or `features/reports`.
  - `pnpm -C frontend test --run`, `typecheck` and `lint` pass.
- **Estimated complexity**: medium

Interfaces consumed:
- `Strand`, `toStrandCounts` (Track 4).
- `MilestoneEntry.epics` with optional counts (Track 1).
- `StateGlyph` (Track 3).

Steps:
1. Update the tests first:
   - `MilestonesPage.test.tsx`:
     - :70 → a strand named "… of 6 epics" with "2/6";
     - :71 → "2 warnings" after `svg[data-glyph="deferred"]`;
     - :164-165 → a strand present, or absent for an entry with `error`.
   - `GanttChart.test.tsx` (:68 "3 of 5 done" → "3/5"; :73-74 → "1/2" and "Prep 1/2"; :84 and :240 → the `parts` list with "1/2") and `MilestonePage.test.tsx` (:411 → "1/2"; :525 → "0/1").
   - `TeamFigures.test.tsx:86-90` → the scope strand is named "27 done, 10 in progress, 3 blocked, 21 ready of 61 beads", where Ready is Open without blocked; the Done figure reads "27 of 61".
   - `progress.test.ts:15` → remove the `prepWords` case.

   Add `// REQ-MILESTONE-UI-001`, `// REQ-MILESTONE-UI-015`, `// REQ-REPORTS-013` and `// REQ-UI-134` comments. Run them: they fail.
2. MilestonesPage:
   - `<Strand counts={toStrandCounts(m.epics)} noun="epics" />` in place of the bar and the text;
   - the warnings cell is `<StateGlyph state="deferred" color="var(--state-blocked)" size={10} />` and `plural(warnings, "warning")` in `text-state-blocked`.
3. Gantt label:
   - `<Strand counts={epicProgressOf(epicBead).counts} noun="tracks" />` replaces `closedTracks`;
   - `prepLabel` replaces `prepWords`.
4. TeamFigures:
   - `ScopeBar` renders `<Strand counts={{ done: closed, inProgress: in_progress, blocked, ready: open - blocked, deferred: 0 }} noun="beads" />` and a legend `ul` of `StateGlyph` + word + count;
   - Done `value={`${closed} of ${scope}`}`.
5. Run `pnpm -C frontend test --run`, `typecheck` and `lint`: they pass.
6. Commit: `git commit -m "feat(ui): the strand in Milestones, the Gantt label and the Team scope (gin-console-rm-strung)"`

### Track 6: Gantt bars and one verdict per row
- **Dependencies**: Track 5
- **Requirements**: REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-UI-132, REQ-UI-133
- **Files**:
  - Modify `frontend/src/features/milestones/gantt.ts:115-142,214-263` (`warningLinesOf`, `verdictOf`, fixed row heights)
  - Create `frontend/src/features/milestones/Verdict.tsx`
  - Modify `frontend/src/features/milestones/GanttChart.tsx:58-72` (`LOOK` fills), `:267-290` (end x passed down; legend swatches), `:400-510` (one bar with `data-bar` and an overflow hatch; verdict in place of warning lines)
  - Modify `frontend/src/components/HintTooltip.tsx` (content `whitespace-pre-line`)
  - Modify `frontend/src/components/Legend.tsx:12-49` (strand entry; `verdicts` prop with the two verdict marks)
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:138` (`<Legend verdicts />`)
  - Test `frontend/src/features/milestones/gantt.test.ts:78-102,207-216`, `frontend/src/features/milestones/GanttChart.test.tsx:152,186,302`, `frontend/src/features/milestones/MilestonePage.test.tsx:34-35,74,77-81,138-180`, `frontend/src/components/Legend.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** Gantt geometry, a severity order with an expanding warning type, fixed row heights, and many tests that select per-day pills.
- **Acceptance criteria**:
  - The four REQ-MILESTONE-UI-024 scenarios and the modified REQ-MILESTONE-UI-003 scenarios ("overflow shown", "One bar per epic") and REQ-MILESTONE-UI-013 scenarios have tests.
  - No `[data-bead]` remains in the Gantt.
  - Rows with 0, 1 and 5 warnings have the same height.
  - `pnpm -C frontend test --run`, `typecheck` and `lint` pass.
- **Estimated complexity**: high

Interfaces produced (`features/milestones/gantt.ts`):
- `export const VERDICT_ORDER = ["late", "overflow", "external_blocker", "after_integration", "oversized", "open_bugs", "spec_due", "spec_not_ready", "unestimated"] as const`.
- `export function warningLines(epic: EpicPlan, today: string, integration: string | null): string[]`:
  - the existing texts, now ordered by `VERDICT_ORDER` (unknown codes last, in their order);
  - `external_blocker` keeps one line per `external_depends_on` entry.
- `export type Verdict = { text: string; knot: boolean; more: number; lines: string[] }`.
- `export function verdictOf(epic: EpicPlan, today: string, integration: string | null): Verdict | null`:
  - it returns `null` without warnings;
  - `knot` is true when the first ordered code is `late` or `external_blocker`;
  - `more` is `lines.length - 1`.
- `VERDICT_LINE = 16`:
  - from lg every epic row is `ROW_HEIGHT + VERDICT_LINE` (72);
  - below lg it is `narrowHeight(...) + VERDICT_LINE`;
  - `WARNING_HEIGHT` is removed.

Interfaces produced (`Verdict.tsx`):
- `export function Verdict({ verdict }: { verdict: Verdict })` returns `<Hint text={verdict.lines.join("\n")}>`, wrapping:
  - `<span data-verdict tabIndex={0} className="inline-flex items-center gap-1 text-xs text-state-blocked">`;
  - inside it, `<StateGlyph state={verdict.knot ? "blocked" : "deferred"} color="var(--state-blocked)" size={10} />`, the text, and `{verdict.more > 0 && <span>+{verdict.more}</span>}`.

Gantt bar:
- One `div[data-bar=<epic id>]` with the classes `absolute rounded-full` and `LOOK[...].fill`, and the style `top: BAR_TOP, height: BEAD_HEIGHT, transform: translateX(x0), width: x1 - x0`.
- `LOOK` fills:
  - open: `border-[1.5px] border-state-ready bg-card`;
  - in_progress: `bg-state-progress`;
  - blocked: `bg-state-blocked`;
  - closed: `bg-state-done`;
  - deferred: `border-[1.5px] border-dashed border-state-deferred bg-card`.
- No `unestimated` style.
- When `x1 > endX`, a child `span[data-overflow]` covers it, with the classes `absolute inset-y-0 right-0 rounded-r-full bg-[repeating-linear-gradient(135deg,var(--state-blocked)_0_2px,transparent_2px_5px)]` and `width: x1 - max(endX, x0)`.
- `endX` is the x of the `data-line="end"` line, passed to `EpicRow`.

Steps:
1. In `gantt.test.ts`, add `// REQ-MILESTONE-UI-024` tests:
   - "Several warnings": `spec_due`, `open_bugs` 2 and `overflow` 2 → text "2 working days past the end", `knot` false, `more` 2, and `lines` in the order overflow, open bugs, spec due.
   - "Late comes first": `unestimated` plus `late` → "Late: should have finished 12 Nov", `knot` true, `more` 1.
   - "No warnings" → `null`.
   - An unknown code comes last.
   - Rewrite :207-216 as "Same height": rows with 0, 1 and 5 warnings have equal heights (72 from lg).

   Run them: they fail.
2. Implement the gantt.ts interfaces. Run the test again: it passes.
3. In `GanttChart.test.tsx` and `MilestonePage.test.tsx`, replace `[data-bead]` selectors:
   - one `[data-bar]` per epic, whose `style.width` equals `endOf(last) - xOf(first)`;
   - "One bar per epic": an epic from Thursday to Wednesday is one element across the weekend, with the class `bg-state-progress`;
   - "overflow shown": the bar has a `[data-overflow]` child and the verdict reads "2 working days past the end";
   - :186 → the verdict has a tooltip with every line.

   Add `// REQ-MILESTONE-UI-003` and `// REQ-MILESTONE-UI-013` comments. Run them: they fail.
4. Edit `GanttChart.tsx`:
   - the bar and the `LOOK` fills;
   - `Verdict` replaces the `warningLines` block at :484-489;
   - the legend swatches use the new fills.

   Add `whitespace-pre-line` to the tooltip content in `HintTooltip.tsx`.
5. In `Legend.tsx`:
   - add a "Progress" entry with `<Strand counts={{ done: 2, inProgress: 1, blocked: 1, ready: 3, deferred: 0 }} noun="tracks" />` and `DEFINITIONS.progress`;
   - with `verdicts`, add "Late or blocked" (knot) and "At risk" (dashed ring), each with one sentence.

   `MilestonePage` passes `verdicts`. Update `Legend.test.tsx` (`// REQ-UI-133`): the panel lists 5 glyphs and a strand; on the milestone page it lists both verdict marks.
6. Run `pnpm -C frontend test --run`, `typecheck` and `lint`: they pass.
7. Commit: `git commit -m "feat(milestone-ui): one bar and one verdict per Gantt row (gin-console-rm-strung)"`

### Track 7: Data as text
- **Dependencies**: Track 6
- **Requirements**: REQ-UI-140, REQ-UI-065, REQ-UI-067, REQ-UI-110, REQ-UI-109, REQ-UI-115, REQ-UI-116, REQ-UI-117, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-121, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-015, REQ-REPORTS-016
- **Files**:
  - Modify `frontend/src/components/PriorityPill.tsx:5-12`
  - Modify `frontend/src/components/SizeBadge.tsx:8-29` (plain text; suffix joined by `", "`)
  - Modify `frontend/src/features/beads/TypeBadge.tsx:9-22` (only `bug`, as a carnelian word; `null` otherwise)
  - Modify `frontend/src/features/beads/KindBadge.tsx:8-15`
  - Modify `frontend/src/features/beads/PrepChip.tsx:5-11`
  - Modify `frontend/src/features/beads/LaneChip.tsx:7-15` (dot and name; optional `slot`)
  - Modify `frontend/src/features/beads/CountBadge.tsx:11-25`
  - Modify `frontend/src/features/beads/BeadHeader.tsx:40-69` (fact line as text; Type fact for every type; capabilities joined by commas)
  - Modify `frontend/src/features/beads/ListRow.tsx:111` (label badges → text)
  - Modify `frontend/src/features/beads/RelationList.tsx:46-47`
  - Modify `frontend/src/features/milestones/UnassignedEpics.tsx:74`
  - Modify `frontend/src/features/milestones/GanttChart.tsx:452`
  - Modify `frontend/src/features/beads/TracksTable.tsx:82` (`LaneChip slot` from `laneSlots`)
  - Modify `frontend/src/features/projects/ProjectCard.tsx:48,49,93,97-100,109,176`
  - Modify `frontend/src/features/reports/team/BeadTable.tsx:35-49,83,100`
  - Modify `frontend/src/features/reports/team/MilestoneLine.tsx:10-33` (status as glyph and word, not a chip)
  - Modify `frontend/src/features/beads/laneGraph.ts:289,409,457` and the lane-graph chip renderer (gate label "Waiting for be #2", "Merged fe #3", surface background, no border)
  - Test `frontend/src/components/PriorityPill.test.tsx:8-21`, `frontend/src/components/SizeBadge.test.tsx`, `frontend/src/features/beads/TypeBadge.test.tsx:7-18`, `frontend/src/features/beads/CountBadge.test.tsx:39-40`, `frontend/src/features/beads/LaneChip.test.tsx`, `frontend/src/features/beads/KindBadge.test.tsx`, `frontend/src/features/beads/BeadCard.test.tsx`, `frontend/src/features/beads/ListView.test.tsx`, `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/features/projects/ProjectsPage.test.tsx`, `frontend/src/features/reports/team/BeadTable.test.tsx`, `frontend/src/features/beads/laneGraph.test.ts`, `frontend/src/features/beads/LaneGraphCanvas.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** each chip keeps its name and props and renders text; the call sites change little; tests that pin pill classes move to text and colour.
- **Acceptance criteria**:
  - The REQ-UI-140 scenarios have tests: List row and Board card without chips, Projects card "missing", filter chip kept.
  - The modified scenarios of REQ-UI-065, -067, -110, -109, -115, -116, -117, -028 ("Fact line and facts") and REQ-REPORTS-016 pass.
  - `grep -rn "Badge" frontend/src/features --include=*.tsx | grep -v test | grep "<Badge"` lists only filter controls.
  - `pnpm -C frontend test --run`, `typecheck` and `lint` pass.
- **Estimated complexity**: medium

Interfaces produced:
- `PriorityPill({ priority, className })` → `<span data-priority={priority} className={cn("text-xs", priority <= 1 ? "font-semibold text-foreground" : "text-muted-foreground", className)}>P{priority}</span>`.
- `TypeBadge({ type, className })` → for `bug`, `<span data-type="bug" className="text-xs font-medium text-type-bug">bug</span>`; otherwise `null`. `BeadHeader` shows the type as the fact "Type".
- `SizeBadge`, `KindBadge`, `PrepChip`: the same text, Hint and truncation, without `Badge`, as `span.text-xs.text-muted-foreground`. `SizeBadge` joins the suffix with `", "` ("5 pt, 7d").
- `LaneChip({ lane, slot })`:
  - `slot?: number`;
  - it renders a `span.size-2.rounded-full` dot (`bg-[var(--lane-<slot>)]` when `slot` is 1..8, else `bg-muted-foreground`) and the name in `text-xs text-muted-foreground`;
  - the title stays "Lane <name>".
- `CountBadge`: an icon and a number in `text-xs text-muted-foreground`, no background.
- `ProjectCard`:
  - "frozen", "ready" and the stage are muted words;
  - "missing" and "stage unknown" are `text-destructive` words.
- `BeadTable`:
  - the status is `StateGlyph` + word;
  - On time is the text "On time", or "<n> d late" in `text-state-blocked`.

Steps:
1. Update the component tests to text and colour, each with its REQ comment:
   - `PriorityPill.test.tsx` "REQ-UI-110 Priority": P0 and P1 have `font-semibold text-foreground`, P2 has `text-muted-foreground`, and none has `bg-` or `border`.
   - `TypeBadge.test.tsx` (REQ-UI-067): only `bug` renders, with `text-type-bug`.
   - `SizeBadge.test.tsx:23`: "5 pt, 7d".
   - `CountBadge.test.tsx:39-40`: no `bg-muted`.
   - `LaneChip.test.tsx`: `slot={2}` dot `bg-[var(--lane-2)]`, no slot → `bg-muted-foreground`.

   Add `ListView.test.tsx` "REQ-UI-140 List row without chips" and `BeadCard.test.tsx` "REQ-UI-140 Board card without chips": no element in the row or card carries `data-slot="badge"`. Add the `ProjectsPage.test.tsx` "REQ-UI-140 Projects card" check. Run them: they fail.
2. Rewrite the seven components per the interfaces.
3. Then the call sites:
   - `BeadHeader`: a fact line, a Type fact, capabilities as text;
   - label badges in `ListRow`;
   - `RelationList`, `UnassignedEpics` and the Gantt size;
   - `ProjectCard`, `BeadTable` and `MilestoneLine`;
   - the lane-graph gate chips become labels.

   Run the tests again: they pass.
4. Fix the remaining tests that pinned pill classes, such as the bead page "Badges and facts", now "Fact line and facts" (REQ-UI-028); the gate label texts (REQ-UI-116, -117); and the REQ-REPORTS-016 status and On time texts. Run `pnpm -C frontend test --run`, `typecheck` and `lint`: they pass.
5. Commit: `git commit -m "feat(ui): data as text, pills only for controls (gin-console-rm-strung)"`

### Track 8: Plain text: no capitals, middle dots or underlined navigation
- **Dependencies**: Track 7
- **Requirements**: REQ-UI-139, REQ-UI-003, REQ-UI-072, REQ-UI-095, REQ-UI-116, REQ-UI-117, REQ-UI-118, REQ-UI-121, REQ-MILESTONE-UI-023, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-016
- **Files**:
  - Modify `frontend/src/features/beads/OverviewCard.tsx:7`
  - Modify `frontend/src/features/beads/MobileFiltersSheet.tsx:61,86,114,167,194,246,269,293` (no `uppercase`; `text-13 font-medium`)
  - Modify `frontend/src/app/Layout.tsx:200-203` and `frontend/src/app/ProjectSwitcher.tsx:35-39` (initials via `.toUpperCase()`)
  - Modify the middle dots:
    - `frontend/src/features/milestones/ForecastCard.tsx:41`
    - `frontend/src/features/reports/headlines.ts:24-26`
    - `frontend/src/features/projects/ProjectCard.tsx:32,47,56`
    - `frontend/src/features/beads/RelationList.tsx:41`
    - `frontend/src/features/beads/epicOverview.ts:66`
    - `frontend/src/features/reports/team/BeadTable.tsx:147`
    - `frontend/src/features/reports/team/TeamFigures.tsx:29,47,157,170`
    - `frontend/src/features/reports/team/MilestoneLine.tsx:17,28,40`
    - `frontend/src/features/beads/laneGraph.ts:341`
    - `frontend/src/features/beads/TracksTable.tsx:40`
    - `frontend/src/features/beads/Breadcrumb.tsx:37,77`
    - `frontend/src/features/beads/LaneSummary.tsx:41`
  - Modify the underlines:
    - navigation links:
      - `frontend/src/features/milestones/MilestonesPage.tsx:138`, `frontend/src/features/milestones/GanttChart.tsx:446,540`, `frontend/src/features/milestones/UnassignedEpics.tsx:69`, `frontend/src/features/milestones/MilestonePage.tsx:81`
      - `frontend/src/features/reports/DeliverySection.tsx:96`, `frontend/src/features/reports/QualitySection.tsx:70`, `frontend/src/features/reports/team/BeadTable.tsx:57,67`, `frontend/src/features/reports/team/TeamSection.tsx:94`
      - `frontend/src/features/beads/MilestoneCard.tsx:32`, `frontend/src/features/beads/Breadcrumb.tsx:84,94`, `frontend/src/features/beads/ScopeTrail.tsx:23`, `frontend/src/features/projects/ProjectCard.tsx:35,171`
      - become `hover:text-identity`, with no `underline`;
    - toggle buttons (`frontend/src/features/projects/ProjectCard.tsx:35` "Show repos", `frontend/src/features/milestones/MilestonePage.tsx:155`, `frontend/src/features/beads/MilestoneCard.tsx:23`, `frontend/src/features/beads/WorkflowCard.tsx:87`) lose `underline`;
    - in-sentence links (`frontend/src/features/beads/BeadDetailPage.tsx:72`, `frontend/src/features/beads/LanesView.tsx:38`, `frontend/src/features/beads/LaneSummary.tsx:31`, `frontend/src/app/UnknownProject.tsx:14`, `frontend/src/app/NotFoundPage.tsx:18,23`) use the new `.prose-link` class.
  - Modify `frontend/src/index.css:249` (`.markdown a`) and add `.prose-link`
  - Modify `frontend/src/components/ui/button.tsx:19`, `frontend/src/components/ui/badge.tsx:20` (`link` variant: `hover:text-identity`, no underline), `frontend/src/components/ui/alert.tsx:57` (`[&_a]:prose-link`)
  - Modify `frontend/src/app/style-guard.test.ts` (rules for capitals, dots and underline)
  - Test the files whose texts change: `frontend/src/features/beads/Breadcrumb.test.tsx`, `frontend/src/features/projects/ProjectsPage.test.tsx`, `frontend/src/features/reports/headlines.test.ts`, `reports/team/*.test.tsx`, `frontend/src/features/milestones/MilestonePage.test.tsx`, `frontend/src/features/beads/LanesView.test.tsx`, `frontend/src/features/beads/EpicOverview.test.tsx`, `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/features/beads/laneGraph.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a listed set of string and class edits, with a guard test that proves none is left.
- **Acceptance criteria**:
  - `style-guard.test.ts` fails on:
    - `uppercase`;
    - `·` outside `app/usePageTitle.ts` and `features/reports/ReportsPage.tsx`;
    - `underline` outside `index.css` and `.prose-link`;

    and it passes on the tree.
  - The modified scenarios of REQ-UI-003, -072, -095, -116, -117, -118, -121, REQ-MILESTONE-UI-023 and REQ-REPORTS-012, -013, -016 pass with commas and words.
  - The REQ-UI-139 scenarios have tests.
  - `pnpm -C frontend test --run`, `typecheck` and `lint` pass.
- **Estimated complexity**: medium

Texts (from the spec):
- Projects card: "Workspace of <n> repos", "Team mode on <host>"; `branch · shape` becomes "<branch>, <shape>".
- Breadcrumb: "Board, 2 filters".
- Reports headline: "27 of 64 done, on pace".
- Merge gates:
  - "Waits for be #2, merge pending";
  - "be #2, merge pending";
  - the lane box meta "ann, lease until …".
- Reports:
  - "Closed, on time" and "Active, late";
  - "working day 8 of 16, 8 left";
  - "<member> (<scope>)";
  - "Beads of <member>";
  - "3 blocked, 8 unassigned";
  - "2 reopens, 1 bug later".
- `ForecastCard`: "Project forecast of open roadmap epics".
- `TracksTable:40` and `LaneSummary:41`: join with `", "`.

CSS:
- `.prose-link, .markdown a { color: inherit; text-decoration: underline; text-decoration-thickness: 1px; text-decoration-color: color-mix(in srgb, var(--identity) 50%, transparent); text-underline-offset: 3px; }`
- `.prose-link:hover, .markdown a:hover { color: var(--identity); }`

Steps:
1. Extend `style-guard.test.ts` with three `// REQ-UI-139` rules per the acceptance criteria. Run it: it fails, listing the sites.
2. Add `// REQ-UI-139` tests:
   - `MobileFiltersSheet.test.tsx`: the section labels "Status", "Priority" and "Labels" have no `uppercase` class.
   - `Breadcrumb.test.tsx`: the "Beads" link has no `underline` class and has `hover:text-identity`.
   - `BeadDetailPage.test.tsx`: a Markdown link sits inside `.markdown`.

   Update the text tests listed under Files to the new strings. Run them: they fail.
3. Apply the edits. Run the guard and all tests: they pass.
4. Run `pnpm -C frontend test --run`, `typecheck` and `lint`: they pass.
5. Commit: `git commit -m "feat(ui): no capitals, middle dots or underlined navigation (gin-console-rm-strung)"`

### Track 9: Identity in the shell
- **Dependencies**: Track 8
- **Requirements**: REQ-UI-141
- **Files**:
  - Modify `frontend/src/app/Layout.tsx:35-60` (`LINK` current item: a 3px identity bar and icon; `Brand` beads done, in progress and ready on an identity thread)
  - Modify `frontend/src/components/Tabs.tsx:41-44` (selected `border-identity`)
  - Modify `frontend/src/features/beads/ListRow.tsx:51,59` (selected `bg-identity-wash shadow-[inset_3px_0_0_var(--identity)]`)
  - Modify `frontend/src/features/beads/GraphNode.tsx:41,53` (selected `bg-identity-wash ring-2 ring-identity`)
  - Modify `frontend/src/features/beads/BeadCard.tsx` (selected card, same as `ListRow`)
  - Modify `frontend/src/features/beads/MultiSelectPopover.tsx:43` (active count `bg-identity-wash text-identity`)
  - Modify `frontend/src/features/milestones/GanttChart.tsx:267,326-327` (today line `border-identity`, solid; Today chip `bg-identity text-primary-foreground`)
  - Test `frontend/src/app/Layout.test.tsx`, `frontend/src/components/Tabs.test.tsx`, `frontend/src/features/beads/ListView.test.tsx`, `frontend/src/features/milestones/GanttChart.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** class changes at known sites, with three scenario tests.
- **Acceptance criteria**:
  - The REQ-UI-141 scenarios have tests:
    - "Current place": the sidebar Beads item has `aria-current` and the identity bar class; the selected row has the wash and the inner bar.
    - "Focus": `--ring` equals `--identity` in `tokens.test.ts`.
    - "Brand mark": three circles and a thread in `Brand`.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: low

Steps:
1. Add the `// REQ-UI-141` tests in `Layout.test.tsx` and `ListView.test.tsx`, and add the `--ring`/`--identity` check to `tokens.test.ts`. Run them: they fail.
2. Apply the class changes. In `Brand`, draw:
   - a `path` thread with `stroke="var(--identity)"`;
   - then circles filled `var(--state-done)` and `var(--state-progress)`;
   - and a ring stroked `var(--state-ready)`.
3. Run `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`: they pass.
4. Commit: `git commit -m "feat(ui): the identity colour marks where you are (gin-console-rm-strung)"`

### Track 10: QA cases and their tests
- **Dependencies**: Track 9
- **Requirements**: REQ-UI-136, REQ-UI-137, REQ-UI-138, REQ-UI-139, REQ-UI-140, REQ-UI-141, REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-025, REQ-BEADS-022, REQ-UI-003, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-059, REQ-UI-064, REQ-UI-065, REQ-UI-067, REQ-UI-072, REQ-UI-095, REQ-UI-109, REQ-UI-110, REQ-UI-112, REQ-UI-115, REQ-UI-116, REQ-UI-117, REQ-UI-118, REQ-UI-120, REQ-UI-121, REQ-UI-130, REQ-UI-132, REQ-UI-133, REQ-UI-134, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-015, REQ-MILESTONE-UI-023, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-016
- **Files**:
  - Create cases in `qa/cases/{ui,milestone-ui,beads,reports}/` for every scenario of the added REQs and the changed scenarios of the modified REQs (`e2e` for UI, `api` for REQ-BEADS-022 and REQ-MILESTONE-UI-025)
  - Modify, re-pin or remove the cases pinned to the modified REQs, as `gin-qa cases plan --change gin-console-rm-strung` lists them, including TC-BEADS-074, 075 and 076 (`child_counts` dicts)
  - Modify `qa/e2e/support/api.ts:75,87,92` (`child_counts` fixtures with the new keys)
  - Create or modify the e2e specs under `qa/e2e/{ui,beads,milestone-ui,reports}/`, including `tc-ui-270`, `tc-ui-271`, `tc-ui-280` and `tc-ui-287`:
    - set localStorage `gin-console.email` with `addInitScript`;
    - stub `/api/*` with `qa/e2e/support/api.ts`.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases from written scenarios and specs in existing patterns, with one judgement per pinned case.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-strung` prints `ok`.
  - `gin-qa cases plan --change gin-console-rm-strung` lists nothing missing or stale.
  - `gin-qa e2e plan` lists none of these cases as missing or stale.
  - `npx playwright test qa/e2e/ui qa/e2e/beads qa/e2e/milestone-ui qa/e2e/reports --trace off --workers 4` passes on the built UI.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-rm-strung` and `gin-qa cases check --change gin-console-rm-strung`. Write, update, re-pin and remove cases per `qa/guidelines.md`: explicit URLs, one action per step, stubbable preconditions.
2. Write or update the e2e specs. Build the UI with `pnpm -C frontend build`, run the specs, and fix them until they pass. Report a product defect instead of changing product code.
3. Commit: `git commit -m "test(qa): cases and e2e specs for the Strung visual system (gin-console-rm-strung)"`

### Track 11: Check on the deployed console
- **Dependencies**: Track 10
- **Requirements**: REQ-UI-059, REQ-UI-064, REQ-UI-136, REQ-UI-137, REQ-UI-138, REQ-UI-139, REQ-UI-140, REQ-UI-141, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-025, REQ-UI-110
- **Files**:
  - Modify `scripts/make_example_project.py:180-300` (`build()`: the cases TC-1 needs)
  - Modify `docs/changes/gin-console-rm-strung-strung/05-tests.md` (TC-1 row and result)
  - Create `qa/evidence/<date>-strung-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** add sample data, run the written check and record it.
- **Acceptance criteria**:
  - TC-1 is recorded as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/...)`.
  - Every TC-1 expectation is a scripted check or is named as seen in a screenshot.
  - No page error occurred.
- **Estimated complexity**: low

TC-1 expectations (written into `05-tests.md` as the TC-1 row, REQ column listing the requirements above):
- On every page (Projects, Beads List/Board/Focus/Graph, bead page, epic page, My Tasks, Milestones, milestone Gantt and Beads, Reports tabs), in both themes, at 1440×900 and 390×844:
  - `getComputedStyle(document.body).fontFamily` starts with "Recursive";
  - the h1 is 28px;
  - no visible text contains " · ";
  - no element has `text-transform: uppercase`;
  - no navigation link is underlined on hover;
  - no `[data-slot="badge"]` sits in a row, card or node.
- On the Beads List:
  - an epic with more than 16 tracks shows segments;
  - an epic with 7 tracks shows 7 beads and its count;
  - the selected row has the identity wash.
- The Graph has no coloured left edges.
- The epic page shows the large strand and its sentence.
- The Milestones list shows a strand per milestone.
- The Gantt:
  - shows one `[data-bar]` per epic;
  - an epic with four warnings shows one verdict with "+3";
  - every epic row has the same height;
  - the today line is amethyst.
- The long-text sweep `qa/evidence/2026-11-15-21h-tc1-run2/sweep2.js` reports no overlap (REQ-UI-110).

Steps:
1. In `build()`, add to the example project, with `Project.add` and `Project.task`:
   - an epic with 19 tracks: 11 closed, 1 in progress, 6 open, 1 deferred;
   - an epic with 7 tracks: 2 closed, 1 in progress, 1 blocked, 3 open;
   - a P1 bug with two labels and a lane;
   - an active-milestone epic whose `gin milestone show` gives four warnings (`overflow`, `open_bugs`, `spec_due`, `late`).

   Run `python3 scripts/make_example_project.py` and check that `example` loads in the console.
2. Deploy the branch to the systemd service, one command at a time:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`
   - Expected: `active` and `200`.
3. Write a Playwright script outside the repo and run it with `NODE_PATH=/home/gin/scotty/node_modules node <script> qa/evidence/<date>-strung-tc1`:
   - Set localStorage `gin-console.email` to `giangdhwhtbr@gmail.com`.
   - Run the viewports and themes above at deviceScaleFactor 2.
   - Make one check per expectation, each in try/catch with a screenshot, and fail on any `pageerror`.
   - Save `results.json` and the script. Run the long-text sweep.
4. Look at the key screenshots in both themes for layout problems that the text checks miss. Record TC-1 in `05-tests.md` with the exact N/N count of `results.json`. Commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-rm-strung)"`

## Integration
- **Branch**: `feat/strung-visual-system`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- [ ] `gin specs lint --change gin-console-rm-strung --against master` prints `ok`, and `gin specs trace --change gin-console-rm-strung` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-rm-strung` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- Line numbers come from `master` at d6e7e3c and drift after earlier tracks; anchor edits on content.
- Spec correction at plan, 2026-11-22: the lane dot is muted outside the Tracks table (REQ-UI-115, REQ-UI-140), because rows, cards, nodes and the bead page do not know the sorted lanes of their scope.
- Epic gin-console-rm-beads-views edits `ListRow`, `BeadCard` and the filter bar after this epic. It takes these styles as its base.

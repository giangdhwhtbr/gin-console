# Plan: My work

Epic: gin-console-rm-my-work
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Diagrams: `docs/specs/ui/diagrams/my-tasks-activity.md`, `docs/specs/ui/diagrams/jump-palette-activity.md`, `docs/specs/beads/diagrams/next-command-activity.md`. Use cases: `docs/specs/ui/use-cases/pick-next-work.md`, `docs/specs/ui/use-cases/jump-to-a-bead.md`.

## Objective

Turn My Tasks into My work so a developer knows what to do next and has the command to start it:
- **My work page** (`/my-tasks`): groups Next up (Assigned to me, Unclaimed), In progress, Blocked, Waiting on me, and Closed when asked; blocker names on rows; cards under 768px; named "My work" everywhere.
- **Bead header**: the next command with Copy, and "Blocked by" links.
- **Bead cards**: "Blocked by <title>".
- **Jump palette**: Ctrl+K or Cmd+K finds a bead of any configured project.

Done when:
- Every scenario of the 6 added REQs (`REQ-BEADS-025`, `REQ-UI-150` to `REQ-UI-154`) and the 8 modified REQs (`REQ-UI-055`, `057`, `063`, `065`, `072`, `099`, `100`, `101`) has a test naming its REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass (backend unchanged).
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-my-work --against master` prints `ok`, `gin specs trace --change gin-console-rm-my-work` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-my-work` prints `ok`.

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
  - My Tasks is one flat table of the beads assigned to the signed-in email; it does not show what is ready for anyone, what is blocked, or whom the developer holds up, and it names no command.
  - `gin state` gives a stage for an epic and no next step for a track, so the console derives a bead's command itself.
  - No card or bead header names the blocker, and there is no way to jump to a bead by id or title.
- **Success criteria:** the 6 added and 8 modified REQs are tested and traced; the 4 feature areas work on a project with beads of every state; no horizontal scroll on My work at 390px.
- **Global constraints** (verbatim from the spec and user decisions of 2026-11-25):
  - Frontend only: no backend change, no endpoint, and no request carries the email (REQ-UI-097 keeps it in the browser).
  - The address `/my-tasks` stays.
  - A bead is in at most one group; groups follow REQ-UI-150; a bead's state is the board-column state (`stateOf`).
  - The next command is one pure function (REQ-BEADS-025); the claim command is the solo `gin task update <id> --claim`.
  - In review, areas and team-mode commands are out of scope.
  - The jump palette searches all configured projects, closed beads after open ones.
- **Assumptions:** in `01-proposal.md`; the plan adds one choice where the spec is silent: a merge gate that blocks a bead is named like the Tracks table (REQ-UI-121), for example "be #2, merge pending", because its title is a path.

## Approach Options
### Option 1: Pure rules first, then the pages
- **Summary:** Track 1 builds the pure rules (groups, next command, blockers); Tracks 2 and 3 wire them into My work and the bead pages in parallel; Track 4 builds the palette independently; Track 5 adds QA cases.
- **Pros:** the rules are testable without rendering; Tracks 2 and 3 touch disjoint files; the palette is fully independent.
- **Cons:** the rules track has no visible result until Tracks 2 and 3 land.

### Option 2: One track per page
- **Summary:** each track implements its rule inside its own page.
- **Pros:** fewer tracks.
- **Cons:** the group rule, the blocker names and the state mapping would be written twice (My work rows, header, cards), which is the drift the design avoids.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the group and command rules are the risk of the epic; a tested pure module is the smallest thing to review first, and it unblocks two parallel tracks.

## Scope
- **In scope:** `REQ-BEADS-025`, `REQ-UI-150` to `REQ-UI-154`, and the modified `REQ-UI-055`, `REQ-UI-057`, `REQ-UI-063`, `REQ-UI-065`, `REQ-UI-072`, `REQ-UI-099`, `REQ-UI-100`, `REQ-UI-101`.
- **Out of scope:** the non-goals of `01-proposal.md`.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 is independent; Tracks 2 and 3 depend only on Track 1 and touch disjoint files; Track 4 is independent of both and runs in parallel with Track 1. Tracks 2, 3 and 4 run in parallel worktrees; Track 5 depends on 2, 3 and 4.
```

## Tasks

### Track 1: Pure rules for groups, next command and blockers
- **Dependencies**: none
- **Requirements**: REQ-BEADS-025, REQ-UI-150
- **Files**:
  - Create `frontend/src/features/my-tasks/groups.ts`
  - Create `frontend/src/features/beads/nextCommand.ts`
  - Create `frontend/src/features/beads/blockers.ts`
  - Test `frontend/src/features/my-tasks/groups.test.ts`
  - Test `frontend/src/features/beads/nextCommand.test.ts`
  - Test `frontend/src/features/beads/blockers.test.ts`
- **Interfaces**:
  - Consumes: `BeadSummary`, `BeadDetail` (`features/beads/api.ts:19-75`), `stateOf` (`features/beads/graph.ts:15`), `isPrep` (`features/beads/prep.ts:2`), `isMergeGate`, `gateWords` (`features/beads/mergeGates.ts:4-20`), `samePerson`, `personOf` (`lib/people.ts`), `closedNewestFirst` (`features/beads/columns.ts:31`).
  - Produces:
    - `groups.ts`: `type GroupKey = "mine" | "unclaimed" | "in_progress" | "blocked" | "waiting" | "closed"`, `type WorkGroup = { key: GroupKey; title: string; beads: readonly BeadSummary[] }`, `compareBeads(a, b)` (priority ascending, `updated_at` newest first, id), `groupWork(beads, email): WorkGroup[]` (always the six groups in order, possibly empty; epics, milestones and merge gates left out).
    - `nextCommand.ts`: `nextCommand(bead: BeadSummary | BeadDetail, email: string, stage: string | null): string | null`.
    - `blockers.ts`: `openBlockers(bead: Pick<BeadDetail, "dependencies">): Relation[]` (type `blocks`, status not `closed`, by id), `blockerSummary(bead, known): { label: string; more: number } | null` (first open blocker by id and how many more; `known` maps loaded beads by id; a closed known blocker is dropped, an unknown one keeps its id), `waitsOn(bead, known, email): string | null` (label of my first open blocker of the bead), `blockerLabel(bead): string` (title, or gate words plus ", merge pending" for a merge gate).
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Bounded pure functions with a clear rule table; many edge cases (prep, deferred, merge gates, assigned elsewhere), all listed in the spec.
- **Steps**:
  1. `groups.test.ts` first, one test per scenario of REQ-UI-150 (each group, prep, epic left out, empty group, deferred only) plus: order, a blocked bead of mine that also blocks another person's bead, and `closed` ordered newest first. Run: `pnpm -C frontend test --run src/features/my-tasks/groups.test.ts`, expect failures.
  2. `groups.ts`:
     ```ts
     import type { BeadSummary } from "@/features/beads/api";
     import { closedNewestFirst } from "@/features/beads/columns";
     import { stateOf } from "@/features/beads/graph";
     import { isMergeGate } from "@/features/beads/mergeGates";
     import { isPrep } from "@/features/beads/prep";
     import { personOf, samePerson } from "@/lib/people";

     export type GroupKey = "mine" | "unclaimed" | "in_progress" | "blocked" | "waiting" | "closed";
     export type WorkGroup = { key: GroupKey; title: string; beads: readonly BeadSummary[] };
     const TITLES: Record<GroupKey, string> = { mine: "Assigned to me", unclaimed: "Unclaimed", in_progress: "In progress", blocked: "Blocked", waiting: "Waiting on me", closed: "Closed" };
     const ORDER: readonly GroupKey[] = ["mine", "unclaimed", "in_progress", "blocked", "waiting", "closed"];

     export function compareBeads(a: BeadSummary, b: BeadSummary): number {
       return a.priority - b.priority || b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id);
     }

     /** REQ-UI-150: the groups of My work; the closed group is filled only from closed beads of mine. */
     export function groupWork(beads: readonly BeadSummary[], email: string): WorkGroup[] {
       const known = new Map(beads.map((b) => [b.id, b]));
       const mine = (b: BeadSummary) => samePerson(b.assignee, email);
       const heldByMe = (b: BeadSummary) => b.blocked_by.some((id) => { const o = known.get(id); return o !== undefined && o.status !== "closed" && mine(o); });
       const groups: Record<GroupKey, BeadSummary[]> = { mine: [], unclaimed: [], in_progress: [], blocked: [], waiting: [], closed: [] };
       for (const bead of beads) {
         if (bead.issue_type === "epic" || bead.issue_type === "milestone" || isMergeGate(bead)) continue;
         const key = groupOf(bead, mine(bead), heldByMe);
         if (key !== null) groups[key].push(bead);
       }
       return ORDER.map((key) => ({ key, title: TITLES[key], beads: key === "closed" ? closedNewestFirst(groups.closed) : groups[key].sort(compareBeads) }));
     }

     function groupOf(bead: BeadSummary, mine: boolean, heldByMe: (b: BeadSummary) => boolean): GroupKey | null {
       const state = stateOf(bead);
       if (state === "done") return mine ? "closed" : null;
       if (mine) return state === "ready" ? "mine" : state === "in_progress" ? "in_progress" : state === "blocked" ? "blocked" : null;
       if (state === "blocked" && heldByMe(bead)) return "waiting";
       return state === "ready" && personOf(bead.assignee) === null && !isPrep(bead.labels) ? "unclaimed" : null;
     }
     ```
  3. `nextCommand.test.ts`: one test per row of REQ-BEADS-025 (the 8 scenarios). `nextCommand.ts`:
     ```ts
     import { personOf, samePerson } from "@/lib/people";
     import type { BeadSummary } from "./api";
     import { stateOf } from "./graph";
     import { isMergeGate } from "./mergeGates";

     const STAGES: readonly string[] = ["discuss", "plan", "orchestrate", "ship"];

     /** REQ-BEADS-025: the command that continues a bead, or null; `stage` is the workflow stage of an epic, null while unknown. */
     export function nextCommand(bead: BeadSummary, email: string, stage: string | null): string | null {
       const state = stateOf(bead);
       if (bead.issue_type === "milestone" || isMergeGate(bead) || state === "done" || state === "blocked" || state === "deferred") return null;
       if (bead.issue_type === "epic") {
         if (stage === null) return null;
         if (stage === "execute") return `/gin:execute ${bead.id}`;
         return STAGES.includes(stage) ? `/gin:${stage} ${bead.id}` : null;
       }
       if (state === "ready") return personOf(bead.assignee) === null || samePerson(bead.assignee, email) ? `gin task update ${bead.id} --claim` : null;
       return samePerson(bead.assignee, email) ? `/gin:execute ${bead.id}` : null;
     }
     ```
  4. `blockers.test.ts` (open and closed blockers, unknown id, merge gate label, waitsOn of mine) then `blockers.ts` per the interface. Run the three test files: pass.
  5. Commit.
- **Acceptance criteria**:
  - Tests name `REQ-UI-150` and `REQ-BEADS-025` and cover every scenario of both, plus: compare order, prep with a `track:` label is not prep, a deferred bead is in no group, a blocker that is closed is not an open blocker, a merge gate blocker is named by its gate words.
  - `pnpm -C frontend test --run src/features/my-tasks/groups.test.ts src/features/beads/nextCommand.test.ts src/features/beads/blockers.test.ts`, `typecheck` and `lint` pass.
- **Estimated complexity**: medium

### Track 2: My work page, labels and phone cards
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-153
- **Files**:
  - Modify `frontend/src/features/my-tasks/MyTasksPage.tsx:1-183` (title "My work"; groups with counts, blocker texts, empty message, card list under 768px, Closed group while closed beads are requested)
  - Create `frontend/src/features/my-tasks/MyWorkGroup.tsx` (one group: heading with count, table rows or cards)
  - Modify `frontend/src/features/my-tasks/load.ts:1-40` (`loadMyTasks` returns every bead of the project, not only mine; drop `MyTask` and `compareTasks`, now `compareBeads`)
  - Modify `frontend/src/features/beads/useWide.ts:1-14` (extract `useMinWidth(px)`; `useWide` stays `useMinWidth(1024)`)
  - Modify `frontend/src/app/Layout.tsx:30` (label "My work")
  - Modify `frontend/src/app/NotFoundPage.tsx:24` (label "My work")
  - Modify `frontend/src/features/beads/Breadcrumb.tsx:45` (label "My work")
  - Modify `README.md:208,329`, `scripts/make_example_project.py:5` (page name in prose)
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`, `frontend/src/features/my-tasks/load.test.ts`, `frontend/src/features/my-tasks/MyWorkGroup.test.tsx`, `frontend/src/features/beads/useWide.test.tsx`, `frontend/src/app/Layout.test.tsx`, `frontend/src/app/NotFoundPage.test.tsx`, `frontend/src/app/App.test.tsx`, `frontend/src/features/beads/Breadcrumb.test.tsx`, `frontend/src/features/beads/ReturnFlow.test.tsx`, `frontend/src/app/usePageTitle.test.tsx`, `frontend/src/app/project.test.ts`
- **Interfaces**:
  - Consumes: `groupWork`, `compareBeads`, `WorkGroup` (Track 1 `features/my-tasks/groups.ts`), `blockerSummary`, `waitsOn` (Track 1 `features/beads/blockers.ts`), `usePageTitle`, `StateMark`, `TypeBadge`, `formatDate`, `matchesMilestone`.
  - Produces: `MyWorkGroup({ group, project, known, email }: { group: WorkGroup; project: string; known: ReadonlyMap<string, BeadSummary>; email: string })`; `useMinWidth(px: number): boolean`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** One page rewritten on a tested rule with several label edits and existing tests to adapt; no new rules.
- **Notes for the implementer**:
  - The milestone filter keeps working: groups are computed from all beads of the project, then each group's beads are filtered by `matchesMilestone`. The Closed group shows when closed beads are requested (`closed=1` or a closed milestone), as REQ-UI-105 expects.
  - Show the page message "No work for <email>" when every shown group is empty; otherwise each empty group shows its heading and "Nothing here".
  - The count line keeps its wording and counts the beads shown in all groups.
  - Layout per width: `useMinWidth(768)` chooses the table or the card list, so the DOM holds one of them.
- **Acceptance criteria**:
  - Tests name `REQ-UI-055`, `057`, `063`, `072`, `099`, `100`, `101`, `153` and cover every scenario of them, including: label in the navigation, document title and breadcrumb; groups and counts; "Blocked by … +1" and "Waits on …" rows; empty message; Closed group; failures (REQ-UI-102) and milestone filter (REQ-UI-105) still pass; a card and no table at 390px, a table and no card at 1024px.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

### Track 3: Next command, blockers and cards on bead pages
- **Dependencies**: Track 1
- **Requirements**: REQ-BEADS-025, REQ-UI-065, REQ-UI-151, REQ-UI-152
- **Files**:
  - Modify `frontend/src/features/beads/BeadHeader.tsx:1-81` (`stage?: string | null`; "Blocked by" links; "Next" with `CopyCommand` above "View in graph")
  - Modify `frontend/src/features/beads/EpicPage.tsx:24-60` (load the workflow, pass its stage to the header)
  - Modify `frontend/src/features/beads/EpicOverview.tsx:11-25`, `frontend/src/features/beads/WorkflowCard.tsx:78-95` (the workflow state comes from `EpicPage`, one request)
  - Modify `frontend/src/features/beads/BeadCard.tsx:30-77` (blocker line)
  - Modify `frontend/src/features/beads/BoardColumn.tsx`, `frontend/src/features/beads/ClosedColumn.tsx`, `frontend/src/features/beads/BoardView.tsx`, `frontend/src/features/beads/FocusView.tsx` (pass `known`, the loaded beads by id)
  - Test `frontend/src/features/beads/BeadHeader.test.tsx` (new), `EpicPage.test.tsx`, `EpicOverview.test.tsx`, `WorkflowCard.test.tsx` (if present), `BeadCard.test.tsx`, `BoardColumn.test.tsx`, `BoardView.test.tsx`, `FocusView.test.tsx`
- **Interfaces**:
  - Consumes: `nextCommand`, `openBlockers`, `blockerSummary`, `blockerLabel` (Track 1), `useEmail` (`app/identity.ts:61`), `CopyCommand` (`features/milestones/CopyCommand.tsx`), `useLoad` (`features/milestones/useLoad.ts`), `fetchEpicWorkflow` (`features/beads/api.ts:267`).
  - Produces: `BeadHeader({ project, bead, graphLink, stage }: { project: string; bead: BeadDetail; graphLink?: boolean; stage?: string | null })`; `WorkflowCard({ workflow, retry }: { workflow: LoadState<EpicWorkflow>; retry: () => void })`; `BeadCard({ project, bead, choice, known }: { …; known?: ReadonlyMap<string, BeadSummary> })`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Wires tested functions into a header shared by four places and lifts one request; many call sites but clear shapes.
- **Acceptance criteria**:
  - Tests name `REQ-UI-151`, `REQ-UI-152`, `REQ-UI-065` and `REQ-BEADS-025` and cover every scenario: the Next command with Copy for a ready task and a claimed task of mine, nothing for a closed task and a blocked one; "Blocked by" links in id order, without closed blockers; the epic command after the workflow loads, and none while it loads or fails; no epic command in the details panel; "Blocked by <title> +n" on Board and Focus cards; the Workflow card shows the same state as before and one request is sent per epic page.
  - Existing tests of the bead header, epic page, board and focus views stay green.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

### Track 4: Jump palette
- **Dependencies**: none
- **Requirements**: REQ-UI-154
- **Files**:
  - Create `frontend/src/features/jump/search.ts` (pure: filter, rank, limit 20)
  - Create `frontend/src/features/jump/load.ts` (`loadAllBeads(): Promise<{ entries: Entry[]; failures: string[] }>`)
  - Create `frontend/src/features/jump/JumpPalette.tsx`
  - Modify `frontend/src/app/App.tsx:48-80` (mount `<JumpPalette key={epoch} />` inside `Layout`)
  - Test `frontend/src/features/jump/search.test.ts`, `frontend/src/features/jump/load.test.ts`, `frontend/src/features/jump/JumpPalette.test.tsx`, `frontend/src/app/App.test.tsx`
- **Interfaces**:
  - Consumes: `fetchProjectBeads` (`features/projects/api.ts:85`), `fetchBeads` (`features/beads/api.ts:212`), `withoutMergeGates` (`features/beads/mergeGates.ts`), `StateMark`, `navigate` (`app/route.ts`), `@base-ui/react/dialog` (`Dialog`, as in `features/beads/MobileFiltersSheet.tsx:93`).
  - Produces: `type Entry = { project: string; bead: BeadSummary }`, `searchBeads(entries: readonly Entry[], text: string): Entry[]` (exact id first, then open before closed, then by id; at most 20), `JumpPalette()`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** New self-contained feature with keyboard handling, focus and a small cache; the dialog comes from base-ui.
- **Notes for the implementer**: the listener is on `document` (`ctrlKey || metaKey` with `k`, no other modifier, `preventDefault`), it stays while another field has the focus, and it is removed on unmount; the palette opens in `Dialog` with the search input focused; a search with no matches says "No beads match"; results have `role="option"` in a `listbox` with the selected one marked (ArrowUp/ArrowDown move, Enter opens). The cache is the component's state, so the `key={epoch}` in `App.tsx` drops it after Refresh data. Escape is the dialog's.
- **Acceptance criteria**:
  - Tests name `REQ-UI-154` and cover every scenario: opens on Ctrl+K and Cmd+K also from a focused input, the browser default is prevented, Escape and the empty hint, "No beads match", results order (exact id, open, closed), the 20 limit, one project failing, the second opening without requests, and a new epoch sending them again.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

### Track 5: QA cases and their tests
- **Dependencies**: Track 2, Track 3, Track 4
- **Requirements**: REQ-BEADS-025, REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-065, REQ-UI-072, REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-150, REQ-UI-151, REQ-UI-152, REQ-UI-153, REQ-UI-154
- **Files**:
  - Modify and add cases in `qa/cases/ui/` and `qa/cases/beads/`, as `gin-qa cases plan --change gin-console-rm-my-work` lists them
  - Modify `qa/e2e/support/api.ts` only if a stub is missing (My work, blockers, epic workflow, palette)
  - Modify e2e specs that use the label "My Tasks" (`grep -rln "My Tasks" qa/e2e`) and create e2e specs under `qa/e2e/ui/` for the new e2e cases
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** Cases and specs from written scenarios in existing patterns; e2e writing stays on the middle model (bd memory `e2e-subagents-use-sonnet`).
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-my-work` prints `ok`, `gin-qa cases plan --change gin-console-rm-my-work` lists nothing missing, stale or obsolete, and `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new e2e specs pass on the built UI (`npx playwright test qa/e2e/ui --trace off`), including My work at 390px without horizontal scroll, the next command copied on a bead page, the blocker links, and the jump palette on two projects.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/rm-my-work` (the spec branch; it is checked out in `.planning/worktrees/gin-console-rm-my-work`)
- **Merge strategy**: parallel-then-merge: Tracks 1 to 4 in worktrees from `feat/rm-my-work` (Track 1 and 4 at once; 2 and 3 after 1 merges into it), Track 5 last.
- **Shared checkout**: another session uses the main checkout on `feat/rm-overview`; this epic never switches that checkout. Merges into `feat/rm-my-work` run in its worktree; the final merge to `master` is asked at ship.

## Validation
- [ ] `uv --directory backend run pytest`, `ruff check .`, and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-my-work --against master` prints `ok` and `gin specs trace --change gin-console-rm-my-work` reports no missing REQ
- [ ] `gin-qa cases check --change gin-console-rm-my-work` prints `ok`
- [ ] Manual check on the built UI: My work groups, a claimed bead's command copied, a blocked bead's header, Ctrl+K jump to a bead of another project, My work at 390px.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- REQ-UI-055, 057, 063, 072 and 099 are also modified by gin-console-rm-overview in another session; the epic that ships second re-writes its MODIFIED blocks (`gin specs hash`, `gin specs lint`).
- Deliverable merge-holds apply exclusively to the Parent Bead (`gin-console-rm-my-work`). Individual track beads close after tests and review pass so dependents unblock.

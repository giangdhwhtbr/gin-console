# Plan: Epic kind and capabilities in the Beads views

Epic: gin-console-it2
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
`GET /api/beads` gives every bead four new fields: `kind` (epics only), `capabilities`, `complexity` and `estimate_minutes`.

The Beads views use them as follows:
- New "Kind" and "Capability" filters.
- A "Technical" or "Parity" badge on rows, cards, the bead page and Gantt labels.
- Capability chips and "Estimate <n>d" on the bead page.
- "<complexity> · <n>d" on epic rows.

The example project carries data for all of these.

Done means:
- Every scenario of REQ-BEADS-001 (MODIFIED), REQ-UI-108 and REQ-UI-109 (ADDED) has a test that names its REQ.
- `gin-qa cases check --change gin-console-it2` prints `ok`.
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
- **Problem statement:** the console treats `kind:` as a plain label, does not read capabilities, and drops `estimated_minutes`. Users cannot see an epic's type, its capabilities or its size, and cannot filter by them.
- **Success criteria:**
  - Everything in the Objective.
  - Backend pytest, ruff and mypy pass.
  - Frontend test, typecheck, lint and build pass.
  - `gin specs lint --change gin-console-it2 --against master` prints `ok`.
  - `gin specs trace --change gin-console-it2` lists no missing REQ.
- **Global constraints** (from the spec):
  - `kind`:
    - For an epic, it is `technical` or `parity` from its first `kind:` label of that value, and `capability` otherwise. Unknown values count as `capability`.
    - For any other type it is `null`.
  - `capabilities`:
    - Start with the first `Capabilities:` line of the description. Split it by commas, strip each name and a trailing `(new)`, and drop empty names.
    - Add the lower-cased `<CAP>` of each `req:REQ-<CAP>-<digits>` label. `<CAP>` may contain hyphens, as in `MILESTONE-UI`.
    - For an epic, also add the `req:` capabilities of its children.
    - Sort the result and remove duplicates.
  - `complexity` is `low`, `medium` or `high` from a `Complexity:` line, else `null`.
  - `estimate_minutes` is `estimated_minutes` when above 0, else `null`. 480 minutes is 1 day, rounded to one decimal.
  - The bead list still leaves the description out (REQ-BEADS-001).
  - Filters:
    - URL `kind` (single value) and `capability` (comma-separated).
    - A bead matches when it or its nearest epic ancestor matches.
    - The Capability filter is hidden when the loaded beads carry no capability.
    - Both filters count in the breadcrumb.
    - They apply to the List, Board, Focus and Graph views and to the milestone Beads tab.
  - Badges:
    - "Technical" or "Parity" only. A `capability` epic gets no badge.
    - The Gantt looks up kind from the beads it already loads.
  - The epic row chip ("<complexity> · <n>d") sits in the List row's clip-first group (REQ-UI-044).
  - Read-only, with no new dependency. New and changed tests carry their REQ-ID.
- **Non-goals:**
  - Editing kinds or capabilities.
  - Grouping by capability.
  - A gin-workflow JSON change.
  - The project card (gin-console-5ox).

## Approach Options
### Option 1: derive the fields in the backend bead list
- **Summary:** pure helpers in `beads/kinds.py` fill the new `BeadSummary` fields. The frontend filters and shows them.
- **Pros:**
  - One derivation, tested in Python, next to the parent map that epic capabilities need.
  - The list keeps leaving out the description.
- **Cons:** the bead list body grows a little. Gzip and the ETag already cover this.

### Option 2: send descriptions and derive in the frontend
- **Pros:** no backend change.
- **Cons:**
  - The description would be added to every bead in the list, which REQ-BEADS-001 forbids.
  - The list body would be much larger.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-15 (`03-design.md`).

## Scope
- **In scope:**
  - `backend/src/gin_console/beads/{kinds.py (new),models.py,source.py}` and tests.
  - `frontend/src/features/beads/{api.ts,filters.ts,BeadFilterBar.tsx,MobileFiltersSheet.tsx,Breadcrumb.tsx,KindBadge.tsx (new),estimate.ts (new),ListRow.tsx,BeadCard.tsx,BeadDetailPage.tsx}` and tests.
  - `frontend/src/features/milestones/GanttChart.tsx` and its test.
  - `scripts/make_example_project.py` and `scripts/README.md`.
  - QA cases.
  - `05-tests.md`.
- **Out of scope:**
  - gin-workflow.
  - The project card.
  - Reports.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend fields and example data), Track 2 (frontend types and filters) and Track 4 (QA cases) share no file and run together, Track 2 building against Track 1's JSON with fixtures; Track 3 (badges, chips, estimate) uses Track 2's types and waits for it; Track 5 checks the merged branch.
```

## Tasks

### Track 1: Kind, capabilities, complexity and estimate in the bead list
- **Dependencies**: none
- **Requirements**: REQ-BEADS-001
- **Files**:
  - Create `backend/src/gin_console/beads/kinds.py` and `backend/tests/test_beads_kinds.py`.
  - Modify `backend/src/gin_console/beads/models.py:12-34`. `BeadSummary` gains `kind`, `capabilities`, `complexity` and `estimate_minutes`.
  - Modify `backend/src/gin_console/beads/source.py:103-114`. `_fields` sets the four fields; epic children come from `snapshot.dependents[id]` entries of type `parent-child`.
  - Test `backend/tests/test_beads_api.py`, with scenarios "Kind, capabilities and estimate" and "Defaults".
  - Modify `scripts/make_example_project.py` and `scripts/README.md`:
    - `ex-e8` gets `kind:technical`.
    - `ex-e11` gets `kind:parity`.
    - `ex-e3`'s description gets `Capabilities: checkout, ui` and `Complexity: medium (payment and address forms)`.
    - Each track of `ex-e3` and `ex-e4` gets a `req:REQ-CHECKOUT-00<n>` or `req:REQ-UI-00<n>` label.
    - `check()` asserts that at least one technical epic, one parity epic, one `Capabilities:` line and one `req:` label exist.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** pure parsing helpers and a bounded addition to the list builder, with written scenarios. The `req:` capability pattern and the epic union need care.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-001, new and existing, has a passing test that names it.
  - pytest, ruff and mypy pass.
  - The example script passes `ruff check` and `mypy --strict`, and its `check()` passes.
- **Estimated complexity**: medium

Interfaces produced:
```py
# beads/kinds.py
Kind = Literal["capability", "technical", "parity"]
Complexity = Literal["low", "medium", "high"]
def kind_of(issue_type: str, labels: Sequence[str]) -> Kind | None: ...
def declared_capabilities(description: str) -> list[str]: ...
def req_capabilities(labels: Sequence[str]) -> list[str]: ...   # r"^req:REQ-([A-Z][A-Z0-9-]*?)-(\d+)$" → group(1).lower()
def complexity_of(description: str) -> Complexity | None: ...  # first "Complexity:" line, first word low|medium|high
# beads/models.py BeadSummary
kind: Kind | None = None
capabilities: list[Text] = []
complexity: Complexity | None = None
estimate_minutes: int | None = None
```
JSON produced, for each `/api/beads` item: `"kind"`, `"capabilities"`, `"complexity"`, `"estimate_minutes"`.

Steps:
1. Write `test_beads_kinds.py`, with each test carrying a `# REQ-BEADS-001` comment:
   - `kind_of("epic", ["kind:technical"])` is `"technical"`.
   - `kind_of("epic", [])` is `"capability"`.
   - `kind_of("epic", ["kind:foo"])` is `"capability"`.
   - `kind_of("task", ["kind:technical"])` is `None`.
   - `declared_capabilities("x\nCapabilities: beads, ui (new),  \ny")` is `["beads", "ui"]`.
   - An empty `Capabilities:` line gives `[]`.
   - `req_capabilities(["req:REQ-MILESTONE-UI-019", "req:REQ-UI-4", "req:bad", "prep"])` is `["milestone-ui", "ui"]`.
   - `complexity_of("Complexity: medium: plan schema")` is `"medium"`. Unknown words give `None`.
   
   Run `uv run --directory backend pytest tests/test_beads_kinds.py` and expect it to fail. Implement `kinds.py`, then expect it to pass.
2. Write the `test_beads_api.py` scenarios. Use `fake_export` rows with `description`, `labels`, `estimated_minutes` and a parent-child dependency. Implement them in `models.py` and `source.py`, then run the backend suite, `ruff check .` and `mypy`.
3. Update the example script and its README rows. Run `python3 scripts/make_example_project.py --out /tmp/it2-example`, then `uv run --directory backend ruff check ../scripts/make_example_project.py` and `uv run --directory backend mypy --strict ../scripts/make_example_project.py`.
4. Commit: `git commit -m "feat(beads): kind, capabilities, complexity and estimate in the bead list (gin-console-it2)"`

### Track 2: Kind and capability filters
- **Dependencies**: none (builds on Track 1's JSON with fixtures)
- **Requirements**: REQ-UI-108
- **Files**:
  - Modify `frontend/src/features/beads/api.ts`. `BeadSummary` gains `kind`, `capabilities`, `complexity` and `estimate_minutes`. The shape check accepts them as missing, with defaults `null`, `[]`, `null` and `null`.
  - Modify `frontend/src/features/beads/filters.ts`:
    - L7-24: `BeadFilters` gains `kind` and `capability`.
    - L34-75: parse and write them.
    - `filterBeads`: matching uses the nearest epic ancestor.
    - `optionsOf`: adds `capabilities`.
  - Modify `frontend/src/features/beads/BeadFilterBar.tsx` and `MobileFiltersSheet.tsx`. Add a Kind select, and a Capability multi-select that is hidden when `options.capabilities` is empty.
  - Modify `frontend/src/features/beads/Breadcrumb.tsx` (`activeFilters`). It counts `kind` and `capability`.
  - Modify `frontend/src/features/beads/beadFixtures.ts`, which takes the new fields with defaults.
  - Test `filters.test.ts`, `BeadsPage.test.tsx` (filter bar and mobile sheet), `Breadcrumb.test.tsx`, and `api.test.ts`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** two filters that follow the existing label and milestone filter patterns. The ancestor matching needs care.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-108 has a passing test that names it.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (Track 3 consumes them):
```ts
// api.ts BeadSummary gains:
kind: "capability" | "technical" | "parity" | null;
capabilities: string[];
complexity: "low" | "medium" | "high" | null;
estimate_minutes: number | null;
// filters.ts BeadFilters gains:
kind: "" | "capability" | "technical" | "parity";   // URL kind
capability: string[];                                 // URL capability, comma-separated
```

Steps:
1. Write `filters.test.ts` (REQ-UI-108):
   - URL round trip for `kind=technical&capability=milestone-ui,ui`. An unknown `kind` reads as `""`.
   - "Kind filter keeps the tracks": technical `e-1` with `t-1`, and capability `e-2` with `t-2`.
   - "Capability filter": `t-1` has `milestone-ui` and `t-3` has `beads`.
   - Matching through the nearest epic ancestor for a sub-task.
   
   Run the tests, implement, then run them again.
2. Write `api.test.ts`: the new fields are accepted and default when missing. Implement.
3. Filter bar and mobile sheet tests (REQ-UI-108):
   - The Kind select sets `kind`.
   - The Capability multi-select lists the capabilities and sets `capability`.
   - "No capabilities": there is no Capability filter.
   
   Implement, reusing the Labels popover pattern.
4. Write the `Breadcrumb.test.tsx` count test. Implement.
5. Run the four frontend checks. Commit: `git commit -m "feat(beads): Kind and Capability filters (gin-console-it2)"`

### Track 3: Kind badge, capability chips and estimates
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-109
- **Files**:
  - Create `frontend/src/features/beads/KindBadge.tsx`, `KindBadge.test.tsx`, `estimate.ts` and `estimate.test.ts`.
  - Modify `frontend/src/features/beads/ListRow.tsx`:
    - The badge goes next to the title.
    - The "<complexity> · <n>d" chip goes in the clip-first group.
  - Modify `frontend/src/features/beads/BeadCard.tsx`: add the badge.
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx`:
    - The badge goes in the badges row.
    - Add capability chips.
    - Add "Estimate <n>d".
  - Modify `frontend/src/features/milestones/GanttChart.tsx`. The badge goes on the epic label; kind comes from the `useBeads` beads already loaded by `GanttTab`, passed down as a `Map<string, Kind>`.
  - Test `ListView.test.tsx`, `BeadCard.test.tsx`, `BeadDetailPage.test.tsx`, and `GanttChart.test.tsx`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** small display components across four views, with written scenarios. The Gantt needs the kind passed from data it already has.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-109 has a passing test that names it.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// KindBadge.tsx
export function KindBadge(props: { kind: BeadSummary["kind"] }): JSX.Element | null; // "Technical" | "Parity" badge, null otherwise
// estimate.ts
export const daysOf = (minutes: number): number => Math.round((minutes / 480) * 10) / 10;
export const estimateText = (minutes: number | null): string | null; // "3d", "0.5d", null
```

Steps:
1. Write `estimate.test.ts` and `KindBadge.test.tsx` (REQ-UI-109):
   - 480 gives "1d", 240 gives "0.5d", 1440 gives "3d", and null gives null.
   - "Technical" and "Parity" render a badge. `capability` and `null` render nothing.
   
   Implement.
2. Write `ListView.test.tsx` (REQ-UI-109):
   - "Technical epic": the row shows "Technical" and "medium · 3d".
   - "Capability epic": no badge and no estimate.
   
   Implement in ListRow. The chip goes inside the existing clip-first group.
3. Write `BeadCard.test.tsx` and `BeadDetailPage.test.tsx`:
   - The badge appears.
   - The chips `beads` and `ui` appear.
   - "Estimate 3d" appears.
   - "Partial day" shows "Estimate 0.5d".
   
   Implement.
4. Write `GanttChart.test.tsx`: the Technical badge appears on the epic label when its bead has `kind: "technical"`. Implement.
5. Run the four frontend checks. Commit: `git commit -m "feat(beads): kind badge, capability chips and estimates (gin-console-it2)"`

### Track 4: QA cases
- **Dependencies**: none
- **Requirements**: REQ-BEADS-001, REQ-UI-108, REQ-UI-109
- **Files**: cases under `qa/cases/{beads,ui}/`: new cases, plus stale ones updated and pinned.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-it2` prints `ok`.
  - `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Record `gin-qa cases check`. Then run `gin-qa cases plan --change gin-console-it2 --format json`.
2. Add one case per new scenario: `api` for REQ-BEADS-001 and `e2e` for REQ-UI-108 and REQ-UI-109. Give each a concrete URL, one action per step, a window-width step where it matters, and Expected exactly as the scenario states it.
3. Pin the stale REQ-BEADS-001 cases. Change their text only where the REQ change touches it. If any case text changes, reset its result.
4. Repeat until `ok`, with no new finding. Commit: `git commit -m "test(qa): cases for epic kind and capabilities (gin-console-it2)"`

### Track 5: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-BEADS-001, REQ-UI-108, REQ-UI-109
- **Files**: modify `docs/changes/gin-console-it2-kind-capabilities/05-tests.md` (TC-1 result).
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and walk TC-1 with Playwright. The user delegated manual validation on 2026-11-15.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-it2-tc1)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-it2-kind-capabilities`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects`, which should print `200`

   Report the rollback command.
2. Regenerate the example with `python3 scripts/make_example_project.py`. Write a Playwright script at 1440×900 and 390×844 that walks every clause of TC-1, and save screenshots to `qa/evidence/<date>-it2-tc1/`.
3. Record TC-1 in `05-tests.md`. Commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-it2)"`

## Integration
- **Branch**: `feat/gin-console-it2-kind-capabilities`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 4 merge in any order, Track 3 after Track 2, and Track 5 checks the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-it2 --against master` prints `ok`, and `gin specs trace --change gin-console-it2` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-it2` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- The Parent Bead `gin-console-it2` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.

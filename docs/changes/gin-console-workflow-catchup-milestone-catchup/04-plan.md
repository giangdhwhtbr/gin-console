# Plan: Milestone catch-up with gin-workflow

Epic: gin-console-workflow-catchup
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
The milestone page catches up with gin-workflow 3.1.1:
- **Retro tab.** A new tab shows the newest `[gin close]` summary and each member's newest `[gin retro]`.
- **Gantt warnings.** The Gantt reads `spec_due`, `after_integration`, `open_bugs` and `oversized` as sentences.
- **Header.** It shows Integration, Deadline and Away.
- **Estimates.** The Gantt shows "<n>d left" and "assumed <n>d".
- **API.** The milestones API passes the new fields through.
- **Team tab.** It offers `gin milestone create`.

Completion is measured three ways:
- Every scenario of the 2 ADDED and 5 MODIFIED REQs has a test naming its REQ.
- `gin-qa cases check --change gin-console-workflow-catchup` prints `ok`.
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
- **Problem statement:** gin-console drops several things gin-workflow now produces:
  - the retro and close comments;
  - `integration`, `deadline`, `away`, `remaining_days`, `assumed_days`, and the `count` of an `open_bugs` warning.
  
  It also shows four warning codes raw, and its Team tab offers a command that no longer exists.
- **Success criteria:**
  - Everything in the Objective.
  - Backend pytest, ruff and mypy pass.
  - Frontend test, typecheck, lint and build pass.
  - `gin specs lint --change gin-console-workflow-catchup --against master` prints `ok`, and `gin specs trace --change gin-console-workflow-catchup` lists no missing REQ.
- **Global constraints** (from the spec):
  - Read-only. No new endpoint and no new dependency. Comments come from the existing `GET /api/beads/{project}/{id}/comments` (`fetchComments` in `features/beads/api.ts:160`).
  - Comment contract, which is fixed by gin-workflow:
    - `[gin close] <milestone-id>` with the labels `Delivered:`, `Spillover:`, `Outcome:`, `Demo:`, `Retros:`, `Metrics:` and `Action:`.
    - `[gin retro] <milestone-id> <member>` with the labels `Went well:`, `Slowed us:` and `Change next:`.
    - The milestone id is compared exactly.
    - The newest close counts, and for each member the newest retro counts.
  - Labels start a line. A label's text runs until the next label line and is rendered as Markdown with `MarkdownText`.
  - New JSON keys are optional. A missing key reads as `null`, or `{}` for `away`.
  - Warning texts:
    - `spec_due`: "Spec due before kick-off"
    - `after_integration`: "Ends after integration on <date>"
    - `open_bugs`: "<n> open bug(s)"
    - `oversized`: "<n> working day(s) longer than the milestone"
    - any other code: the raw code.
  - Estimate text:
    - "<n>d left" when the epic is `in_progress` and `remaining_days < estimate_days`;
    - "assumed <n>d" when `estimate_days` is null and `assumed_days` is set.
  - New and changed tests carry their REQ-ID.
- **Non-goals:**
  - a Metrics chart;
  - writing retros;
  - epic kind or capabilities (gin-console-it2);
  - the project card (gin-console-5ox).

## Approach Options
### Option 1: a pure comment parser plus a Retro tab, and field pass-through
- **Summary:**
  - `retro.ts` parses the comments, and `RetroTab.tsx` renders them.
  - The models and types gain the new optional fields.
  - The Gantt and header read them.
- **Pros:**
  - The parser is testable on its own.
  - No backend endpoint.
  - It follows the existing milestone-feature patterns.
- **Cons:** the comments load on the client, one more request when the Retro tab or its count is needed.

### Option 2: parse the comments in the backend into `MilestoneDetail`
- **Pros:** one request.
- **Cons:**
  - It adds bd comment calls to every milestone show, and those are cached for 5 s.
  - It mixes Beads into the milestones context, against ADR 0001 (contexts per epic).

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** this is the design confirmed on 2026-11-15 (`03-design.md`).

## Scope
- **In scope:**
  - `backend/src/gin_console/milestones/models.py` and `backend/tests/test_milestones_api.py`;
  - `frontend/src/features/milestones/{api.ts,gantt.ts,GanttChart.tsx,MilestonePage.tsx,retro.ts (new),RetroTab.tsx (new),useMilestoneComments.ts (new)}` and their tests;
  - `frontend/src/features/reports/team/TeamSection.tsx` and its test;
  - QA cases;
  - `05-tests.md`.
- **Out of scope:**
  - gin-workflow;
  - Beads views;
  - the project card.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (schedule facts, warnings, estimates, header, Team command) and Track 2 (Retro tab) touch different parts of the milestone feature and run together, meeting only in MilestonePage.tsx (header vs tabs, different blocks) and api.ts (detail fields vs MilestoneTab), which merge cleanly; Track 3 (QA cases) is independent; Track 4 checks the merged branch.
```

## Tasks

### Track 1: Schedule facts, warnings, estimates and the Team command
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-020, REQ-REPORTS-017
- **Files**:
  - Modify `backend/src/gin_console/milestones/models.py`:
    - L54-56: `EpicWarning.count: int | None = None`.
    - L64-75: `EpicPlan.remaining_days`, `assumed_days: int | None = None`.
    - L77-91: `MilestoneDetail.integration`, `deadline: IsoDate | None = None` and `away: dict[str, list[Text]] = {}`.
  - Test `backend/tests/test_milestones_api.py`: the "schedule facts" scenario and an older output.
  - Modify `frontend/src/features/milestones/api.ts`:
    - L29: `EpicWarning` gains `count: number | null`.
    - The detail and epic types and the shape checks get the same fields, defaulting to null or `{}`.
  - Modify `frontend/src/features/milestones/gantt.ts:90-109`: `warningLines(epic, today, integration)` gains the four cases.
  - Modify `frontend/src/features/milestones/GanttChart.tsx`:
    - L372-375: the estimate text.
    - Pass `plan.integration` to `warningLines`.
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:94-125` (`MilestoneHeader`): Integration, Deadline and Away after the lanes. Add the `awayLine` helper in `format.ts`.
  - Modify `frontend/src/features/reports/team/TeamSection.tsx:35`: `gin milestone create`.
  - Test `gantt.test.ts`, `GanttChart.test.tsx`, `MilestonePage.test.tsx`, `format.test.ts`, `ReportsPage.test.tsx` and `api.test.ts` (milestones).
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded additions of optional fields and display text across the backend model and a few views, each with a written scenario.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013 and REQ-MILESTONE-UI-020, plus the changed REQ-REPORTS-017 one, has a passing test naming its REQ.
  - pytest, ruff, mypy and the four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
```py
# milestones/models.py
class EpicWarning(BaseModel): code: Text; days: int | None = None; count: int | None = None
class EpicPlan(...):  remaining_days: int | None = None; assumed_days: int | None = None
class MilestoneDetail(...): integration: IsoDate | None = None; deadline: IsoDate | None = None; away: dict[str, list[Text]] = {}
```
```ts
// milestones/api.ts
export type EpicWarning = { code: string; days: number | null; count: number | null };
// EpicPlan gains remaining_days: number | null; assumed_days: number | null
// MilestoneDetail gains integration: string | null; deadline: string | null; away: Record<string, string[]>
// milestones/format.ts
export function awayLine(away: Readonly<Record<string, readonly string[]>>, today: string): string | null; // "Away: ann 18–20 Nov, bao 25 Nov", null when empty; a malformed range is shown raw
// milestones/gantt.ts
export function warningLines(epic: EpicPlan, today: string, integration: string | null): string[];
```

Steps:
1. **pytest** (REQ-MILESTONE-UI-008).
   - "schedule facts": a fake `gin milestone show` prints `integration`, `deadline: null`, `away`, and an epic with `remaining_days: 2`, `assumed_days: null` and a warning `{code: "open_bugs", count: 2}`. Assert that the response carries them unchanged.
   - An older output without the keys gives nulls and `{}`.
   
   Run `uv run --directory backend pytest tests/test_milestones_api.py` and expect a failure. Implement, run it again and expect a pass, then run `ruff check .` and `mypy`.
2. **Frontend API test.** `api.test.ts` accepts the new fields and an older shape without them. Implement the types and the shape checks.
3. **`gantt.test.ts`** (REQ-MILESTONE-UI-003, "newer warnings"):
   - "Spec due before kick-off".
   - "Ends after integration on 24 Nov".
   - "2 open bugs", and "1 open bug" for a count of 1.
   - "3 working days longer than the milestone", and "1 working day longer than the milestone" for 1 day.
   - An unknown code shows raw.
   
   Implement.
4. **`GanttChart.test.tsx`** (REQ-MILESTONE-UI-013, "remaining and assumed days"): "2d left" and "assumed 3d". The existing estimate cases stay. Implement.
5. **Header** (REQ-MILESTONE-UI-020).
   - `format.test.ts` covers `awayLine`: single days, ranges within a month and across months, a malformed value shown raw, and empty input giving null.
   - `MilestonePage.test.tsx` covers the scenarios "All three" and "Older gin-workflow".
   
   Implement.
6. **Team tab** (REQ-REPORTS-017). `ReportsPage.test.tsx` "no milestones" expects `gin milestone create`. Implement.
7. Run the backend checks and the four frontend checks, and expect them all to pass. Commit with `git commit -m "feat(milestones): integration, deadline, away, remaining days and newer warnings (gin-console-workflow-catchup)"`.

### Track 2: Retro tab
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-019, REQ-MILESTONE-UI-018
- **Files**:
  - Create `frontend/src/features/milestones/retro.ts`, `retro.test.ts`, `useMilestoneComments.ts`, `RetroTab.tsx` and `RetroTab.test.tsx`.
  - Modify `frontend/src/features/milestones/api.ts:178`: `MilestoneTab` gains `"retro"`, and `milestonePath` writes `tab=retro`.
  - Modify `frontend/src/features/milestones/MilestonePage.tsx`:
    - L18-21 (`TABS`): add Retro.
    - The tab parsing: `tab=retro`.
    - The panel for `retro`.
    - The label with the count.
  - Test `MilestonePage.test.tsx` and `api.test.ts` (milestones).
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded new tab with a pure parser and written scenarios. The label parsing and the newest-per-member rule need care.
- **Acceptance criteria**:
  - Every scenario of REQ-MILESTONE-UI-019, and the changed REQ-MILESTONE-UI-018, has a passing test naming its REQ.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// retro.ts
export const CLOSE_LABELS = ["Delivered", "Spillover", "Outcome", "Demo", "Retros", "Metrics", "Action"] as const;
export const RETRO_LABELS = ["Went well", "Slowed us", "Change next"] as const;
export type Section = { label: string; text: string };
export type CloseEntry = { author: string; created_at: string; sections: Section[] };
export type RetroEntry = { member: string; author: string; created_at: string; sections: Section[] };
export type RawEntry = { kind: "close" | "retro"; member: string | null; author: string; created_at: string; text: string };
export function parseRetros(
  comments: readonly { author: string; created_at: string; text: string }[],
  milestoneId: string,
): { close: CloseEntry | null; retros: RetroEntry[]; unparsed: RawEntry[] };
// useMilestoneComments.ts: one load per page, shared by the tab label and RetroTab
export function useMilestoneComments(project: string, id: string): { state: "loading" | "error" | "ok"; comments: Comment[]; error: string | null; retry: () => void };
// RetroTab.tsx
export function RetroTab(props: { milestoneId: string; comments: ReturnType<typeof useMilestoneComments> }): JSX.Element;
```

Steps:
1. **`retro.test.ts`** (REQ-MILESTONE-UI-019). Cover these cases:
   - **Close and retros:** the close sections hold only the labels that are present, in the order of `CLOSE_LABELS`.
   - **Newest per member:** of `[gin retro] m1 ann` on 10 Nov and 12 Nov, the one from 12 Nov is kept.
   - **Other milestones:** `[gin retro] m2 ann` and `[gin retro] m10 ann` are ignored for `m1`. Match the id exactly, followed by whitespace or the end of the line.
   - **Not in the expected format:** a matching comment with no labels goes to `unparsed`.
   - **Multi-line text:** a label's text that spans several lines runs until the next label.
   - **Label case:** labels are matched case-sensitively, as gin writes them.
   - **Retro without a member name:** it goes to `unparsed`.
   
   Run `pnpm -C frontend test --run src/features/milestones/retro.test.ts` and expect it to fail. Implement, run it again and expect it to pass.
2. **`RetroTab.test.tsx`** (REQ-MILESTONE-UI-019). Cover these cases:
   - the close block shows the author, the date and each section;
   - the retro cards appear by member;
   - the "Not in the expected format" note;
   - the empty state text with `/retro`;
   - loading;
   - the error with a Retry that calls `retry`.
   
   Implement it with `MarkdownText` for the section text.
3. **`MilestonePage.test.tsx`** (REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-019). Cover these cases:
   - the tabs are Gantt, Beads and Retro;
   - `?tab=retro` shows the Retro panel;
   - the label reads "Retro 2" after the comments load, and "Retro" with no number when there are no retros;
   - changing tab keeps only `start` and `zoom`, as REQ-MILESTONE-UI-018 says.
   
   Stub `/api/beads/<p>/<id>/comments` in `milestoneFixtures.ts`. Implement the changes in `MilestonePage` and `milestonePath`.
4. Run the four frontend checks and expect them to pass. Commit with `git commit -m "feat(milestones): Retro tab with close and member retros (gin-console-workflow-catchup)"`.

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-019, REQ-MILESTONE-UI-020, REQ-REPORTS-017
- **Files**: cases under `qa/cases/{milestone-ui,reports}/`. Add new cases, and update and re-pin the stale ones.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-workflow-catchup` prints `ok`, and `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Record the output of `gin-qa cases check`, then run `gin-qa cases plan --change gin-console-workflow-catchup --format json`.
2. Add one case per new or changed scenario: `api` for REQ-MILESTONE-UI-008 and `e2e` for the rest. Each case needs concrete URLs, one action per step (including a window-width step where one matters), and Expected written exactly as the scenario says it.
3. Update and pin the stale cases. Change the text only where the REQ change touches it, for example the command in the REQ-REPORTS-017 cases. Reset the result of any case whose text changed with `gin-qa cases result <TC> "not run"`.
4. Repeat until `gin-qa cases check --change gin-console-workflow-catchup` prints `ok` with no new finding. Commit with `git commit -m "test(qa): cases for the milestone catch-up (gin-console-workflow-catchup)"`.

### Track 4: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-MILESTONE-UI-019, REQ-MILESTONE-UI-020, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-REPORTS-017
- **Files**: modify `docs/changes/gin-console-workflow-catchup-milestone-catchup/05-tests.md` to record the TC-1 result.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and walk TC-1 with Playwright. The user delegated manual validation on 2026-11-15.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-catchup-tc1)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-workflow-catchup-milestones`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects` should print `200`.
   
   Report the rollback command.
2. Run `python3 scripts/make_example_project.py --out /tmp/example-catchup`. In `/tmp/example-catchup`, which is outside any repository, run:
   - `bd comments add ex-m2 "[gin close] ex-m2\nDelivered: …\nSpillover: …\nAction: …"`
   - two `[gin retro] ex-m2 ann` comments and one `[gin retro] ex-m2 bao` comment
   - `gin milestone update ex-m2 --integration <date> --away ann:<from>..<to>`
   - `bd export -o .beads/issues.jsonl`
   
   Serve the copy with a second console on port 8711, using `GIN_CONSOLE_CONFIG` to point at a temporary config whose project is named `catchup`. The console must also have a project without milestones for the Team tab case; that project is `gin-harness` or an empty temporary Beads project.
3. Write and run a Playwright script at 1440×900 and 390×844 that walks every clause of TC-1, with screenshots in `qa/evidence/<date>-catchup-tc1/`. Then stop the console on port 8711.
4. Record TC-1 in `05-tests.md` and commit it with `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-workflow-catchup)"`.

## Integration
- **Branch**: `feat/gin-console-workflow-catchup-milestones`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 3 merge in any order. Resolve any textual conflict in `MilestonePage.tsx` or `api.ts` by keeping both sides. Track 4 checks the merged branch.

## Validation
- [ ] Backend pytest, ruff and mypy pass
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-workflow-catchup --against master` prints `ok`, and `gin specs trace --change gin-console-workflow-catchup` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-workflow-catchup` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- The Parent Bead `gin-console-workflow-catchup` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.

# Plan: Team tab in Reports, with milestone KPIs per member

Epic: gin-console-slc
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Mockup: `docs/specs/reports/assets/2026-11-12/mockup/index.html`. Diagram: `docs/specs/reports/diagrams/team-tab-activity.md`. Use case: `docs/specs/reports/use-cases/review-team-in-milestone.md`.

## Objective
- `GET /api/reports/team?project=<name>[&milestone=<id>]` returns, for one milestone of one project:
  - the project's dated milestones and the selected one;
  - the scope beads with their bucket, member, epic and times;
  - the team's and each member's KPIs;
  - the beads closed per working day per member.

  It reads the `bd export` snapshot only, and caches the answer for 60 seconds.
- The Reports page opens on a new Team tab. It has a Milestone choice and a Member choice, and shows:
  - the milestone line;
  - the figures;
  - the scope-by-status bar;
  - the closed-per-day chart;
  - the Team KPI table;
  - the bead list with Open, In progress, Closed and All.

  Milestone, member and status stay in the URL.
- The Delivery tab and `GET /api/reports` drop work in progress: `delivery.wip`, `delivery.oldest`, "Oldest in progress", "In progress by member" and "In progress now".

Every scenario of the ADDED and MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-slc` prints `ok`. TC-1 in `05-tests.md` passes on the Tailscale deploy.

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
- **Problem statement:** the Reports page has no view of a milestone. Its only bead list is the 5 oldest in-progress beads, so it cannot tell a lead what each member has open, in progress and closed in a milestone, or whether the milestone will finish on time.
- **Success criteria:**
  - Everything in the Objective.
  - These all pass:
    - `uv run --directory backend pytest`
    - `uv run --directory backend ruff check .`
    - `uv run --directory backend mypy`
    - `pnpm -C frontend test --run`
    - `pnpm -C frontend typecheck`
    - `pnpm -C frontend lint`
    - `pnpm -C frontend build`
  - `gin specs lint --change gin-console-slc --against master` prints `ok`, and `gin specs trace --change gin-console-slc` lists no missing REQ.
- **Global constraints** (from the spec and `AGENTS.md`):
  - Read-only: nothing writes to Beads.
  - The new route reads only through `SnapshotStore` and starts no process (`gin`, `bd`, anything). No `bd history`: reopens and bugs come from the bead's own share of `metadata.ai_usage.quality` (REQ-REPORTS-002).
  - The change stays inside the `reports` context, plus the Reports page shell (ADR 0001).
  - A working day is Monday to Friday. `today` and every date of a timestamp are taken in the server's local time zone (`datetime.astimezone()`).
  - Scope means non-epic, non-milestone beads under an epic whose parent is the milestone, at any depth.
  - Buckets: `closed`, `in_progress`, and `open` for every other status. The member is `assignee`, or `Unassigned`.
  - The in-progress warning threshold is a fixed 3 days.
  - Member filtering, counts, sorting and paging run in the browser. A member change sends no request.
  - New and changed tests carry their REQ-ID in the test name or a comment.
  - Linux, macOS and Windows paths are untouched, and no dependency is added.
- **Non-goals:**
  - A burndown, projected finish or milestone comparison.
  - The Team tab for "All projects".
  - Holidays or `away` days.
  - Merging two assignee strings of one person.

## Approach Options
### Option 1: a server-built team report, filtered in the browser
- **Summary:** `reports/team.py` builds scope, KPIs, the day series and the bead rows from the snapshot beads. The page asks once per project and milestone, and derives the member view from `members` and `beads`.
- **Pros:**
  - The KPI rules sit in pure Python next to the existing report rules (`own_share`, cycle time), tested without a browser.
  - One request per milestone; no request for a member change.
- **Cons:** the response carries every scope bead, a few hundred rows at most.

### Option 2: compute everything in the browser from `GET /api/beads`
- **Summary:** load the project's beads and derive milestones, scope and KPIs in TypeScript.
- **Pros:** no new endpoint.
- **Cons:**
  - `/api/beads` has no `ai_usage` own share, so rework would need the epic arithmetic of REQ-REPORTS-002 rewritten in TypeScript.
  - It also has no `started_at`.
  - Two sources of truth for cycle time.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-12 (`03-design.md`). It reuses the report's own-share and cycle rules and keeps a member change free of requests.

## Scope
- **In scope:**
  - Backend:
    - `backend/src/gin_console/reports/{models.py,source.py,service.py,router.py}`;
    - new `reports/team.py`;
    - new `backend/tests/test_reports_team.py` and `backend/tests/test_reports_team_api.py`;
    - `backend/tests/test_reports_service.py`.
  - Frontend:
    - `frontend/src/features/reports/{filters.ts,api.ts,headlines.ts,DeliverySection.tsx,ReportsPage.tsx,reportFixtures.ts}`;
    - new `teamApi.ts`;
    - new `team/` folder;
    - their tests.
  - `qa/cases/reports/` and `qa/cases/ui/`.
  - `05-tests.md` (TC-1 result).
- **Out of scope:**
  - `milestones/` (backend and frontend), which is only linked to.
  - `beads/`, `projects/`.
  - gin-workflow.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (frontend shell) share no file and Track 2 builds against the JSON shape written in this plan with its own fixtures, so they run together; Track 3 fills the Team panel Track 2 creates and waits for it; Track 4 (QA cases) needs only the spec and runs beside them; Track 5 is the human check after all four merge.
```

## Tasks

### Track 1: Team report API and Delivery without work in progress
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-004, REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-011
- **Files**:
  - Modify `backend/src/gin_console/reports/models.py:61-79` (`ReportBead` gains `priority`, `start`, `end`, `kickoff`)
  - Modify `backend/src/gin_console/reports/models.py:163-185` (drop `WipRow`, `WipBead`, `DeliverySection.wip` and `.oldest`; add the team models at the end of the file)
  - Modify `backend/src/gin_console/reports/source.py:12-63` (read `priority`; for milestone rows, read `metadata.start`, `end` and `kickoff` when they are strings)
  - Modify `backend/src/gin_console/reports/service.py:349-397` (`_delivery` drops `wip` and `oldest`; remove `OLDEST`, the `WipRow` and `WipBead` imports)
  - Create `backend/src/gin_console/reports/team.py`
  - Modify `backend/src/gin_console/reports/router.py:28-88` (`GET /api/reports/team`)
  - Test `backend/tests/test_reports_team.py`
  - Test `backend/tests/test_reports_team_api.py`
  - Test `backend/tests/test_reports_service.py:279-297` (replace `test_reports_004_work_in_progress`)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** one module with a clear spec. Raised effort for the intricate date logic: working days, weekend mapping, default milestone order, pace windows and local dates, each with a written scenario.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-008 to REQ-REPORTS-011, and the "no work in progress" scenario of REQ-REPORTS-004, has a passing test naming its REQ.
  - A test monkeypatches `subprocess.run` and `subprocess.Popen` to raise, and `GET /api/reports/team` still answers 200.
  - The full backend suite, `ruff` and `mypy` pass.
- **Estimated complexity**: medium

Interfaces produced (Tracks 2 and 3 consume the JSON):
```python
# reports/models.py
BeadBucket = Literal["open", "in_progress", "closed"]
MilestoneStatus = Literal["active", "scheduled", "planned", "closed"]

class ReportBead(BaseModel):  # existing; added fields
    priority: int | None = None
    start: str | None = None    # milestone rows only: metadata.start as written
    end: str | None = None
    kickoff: str | None = None

class TeamMilestone(BaseModel):
    id: str
    title: str
    status: MilestoneStatus
    start: date
    end: date
    closed_on: date | None

class TeamEpic(BaseModel):
    id: str
    title: str

class TeamBead(BaseModel):
    id: str
    title: str
    issue_type: str
    status: str
    bucket: BeadBucket
    assignee: str | None
    priority: int | None
    created_at: datetime
    epic: TeamEpic
    started_at: datetime | None
    closed_at: datetime | None
    cycle_days: float | None   # round 1
    age_days: float | None     # in_progress only, round 1
    late_days: int | None      # closed only
    rework: int | None         # own reopens + bugs; None without readable ai_usage

class TeamFigures(BaseModel):
    scope: int
    closed: int
    in_progress: int
    open: int
    blocked: int
    unclaimed: int
    done: float | None             # round 4
    throughput: float              # beads per 5 working days, round 1
    cycle_median: float | None     # round 2
    oldest_in_progress: float | None  # round 1
    on_time: float | None          # round 4
    rework_rate: float | None      # round 4
    reopens: int
    bugs: int

class MemberFigures(TeamFigures):
    member: str

class TeamTotals(TeamFigures):
    working_days: int
    elapsed: int
    days_left: int
    pace: float                    # throughput / 5, round 2
    pace_needed: float | None      # round 2
    late_open: int

class DayRow(BaseModel):
    date: date
    closed: dict[str, int]         # member -> beads closed that working day; members with 0 left out

class TeamReport(BaseModel):
    generated_at: datetime
    project: str
    today: date
    milestones: list[TeamMilestone]
    undated: int
    milestone: str | None
    team: TeamTotals | None        # None when milestones is empty
    members: list[MemberFigures]
    days: list[DayRow]
    beads: list[TeamBead]

# reports/team.py
def build_team(beads: list[ReportBead], *, now: datetime, project: str, milestone: str | None) -> TeamReport: ...
```

Steps:

1. **Tests for the pure builder.** Write `backend/tests/test_reports_team.py`. Build rows with `report_beads.row`, `closed` and `usage`; `parent=` sets the parent. Read them with `read_beads(snap(rows), "alpha")` and call `build_team(..., now=NOW, project="alpha", milestone=None)`, with `NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)` (a Thursday). Write every timestamp at `T12:00:00Z`, so the local date is the same from UTC−11 to UTC+11.

   Helpers:
   - `ms(ident, start, end, *, status="open", kickoff=None, closed_at=None)` returns `row(ident, issue_type="milestone", status=status, closed_at=closed_at, metadata={"start": start, "end": end, **({"kickoff": kickoff} if kickoff else {})})`.
   - Pass `metadata` through `row`'s `**fields`. It is a dict, as in real exports.

   Tests, each with a `# REQ-REPORTS-0NN` comment:
   - `test_reports_008_status_and_default`:
     - `m1` is closed on 2026-10-31, `m2` has kickoff 2026-11-02, `m3` has no kickoff.
     - `milestone == "m2"`.
     - `[(m.id, m.status) for m in milestones] == [("m1", "closed"), ("m2", "active"), ("m3", "planned")]`, with the list sorted by `start`, then `id`.
     - `m1.closed_on == date(2026, 10, 31)`.
   - `test_reports_008_scheduled`: a kickoff after `today` gives `scheduled`.
   - `test_reports_008_default_order`, one assert per rule (milestone ids are examples):
     - Without an active milestone, the open one whose period holds `today` wins over a later open one.
     - Without either, the open one with the earliest future `start` wins.
     - With only closed ones, the latest `end` wins.
   - `test_reports_008_named_and_unknown`: `milestone="m1"` selects `m1`; `milestone="gone"` selects the default.
   - `test_reports_008_undated`: a milestone row without `end` is not in `milestones`, and `undated == 1`. A row with `end: "soon"` is also undated.
   - `test_reports_008_no_milestones`: `milestones == []`, `milestone is None`, `team is None`, and `members`, `days` and `beads` are empty.
   - `test_reports_009_nested_scope`:
     - Rows: `m2`; epic `e1` with `parent="m2"`; `e1.1` with `parent="e1"`; `e1.1.1` with `parent="e1.1"`; epic `e9` with `parent="m3"`; `e9.1` with `parent="e9"`.
     - Expected: `[b.id for b in beads] == ["e1.1", "e1.1.1"]`, both with `epic.id == "e1"`.
   - `test_reports_009_buckets_and_members`:
     - `blocked` without an assignee: bucket `open`, member `Unassigned`.
     - `deferred` with assignee `ann`: bucket `open`, member `ann`.
     - `in_progress` with assignee `bao`: bucket `in_progress`, member `bao`.

     Check the member through `members[*].member` and the counts.
   - `test_reports_009_late_close`: the milestone ends on 2026-11-27, and a scope bead closed on 2026-12-01 has `late_days == 2`. A bead closed on 2026-11-27 has `late_days == 0`.
   - `test_reports_009_rework_and_age`:
     - A closed bead with `ai=usage(10, reopens=1, bugs=1)` has `rework == 2`.
     - A closed bead without `ai` has `rework is None`.
     - An in-progress bead started 2026-11-09T12:00Z has `age_days == 3.0`.
   - `test_reports_010_pace`:
     - Milestone `m2` runs 2026-11-02 to 2026-11-27 with kickoff 2026-11-02.
     - It has 64 scope beads under one epic: 27 closed, 18 of them on 2026-11-06, 09, 10, 11 or 12 (spread over those days) and 9 on 2026-11-03; 10 in progress; 27 open.
     - `team.throughput == 18`, `pace == 3.6`, `days_left == 11`, `pace_needed == round(37 / 11, 2)`, `elapsed == 9`, `working_days == 20`.
   - `test_reports_010_closed_milestone`:
     - The milestone runs 2026-10-05 to 2026-10-30 and closed on 2026-11-03.
     - It has 58 closed beads, 7 of them closed on 2026-11-02 or 2026-11-03.
     - `team.throughput == 13.2`, `pace_needed is None`, `on_time == round(51 / 58, 4)`.
   - `test_reports_010_rework_rate`:
     - `ann` closed 4 beads with `ai` (one with `reopens=1`) and 1 without.
     - `ann`'s row has `rework_rate == 0.25` and `reopens == 1`.
   - `test_reports_010_member_order`: `ann` has 3 beads, `bao` 5, and 6 have no assignee. `[m.member for m in members] == ["bao", "ann", "Unassigned"]`.
   - `test_reports_010_past_end`:
     - The milestone is open and ended 2026-11-11.
     - 4 beads are open or in progress.
     - `team.late_open == 4`, `pace_needed is None`, `days_left == 0`.
   - `test_reports_010_blocked_unclaimed`: in `team`, `blocked` counts only status `blocked`, and `unclaimed` only open beads without an assignee.
   - `test_reports_011_weekend_close`: `ann` closed a bead on 2026-11-08 (a Sunday). The `days` entry for 2026-11-06 has `closed == {"ann": 1}`.
   - `test_reports_011_range`: open milestone 2026-11-02 to 2026-11-27 → `len(days) == 20`, `days[0].date == date(2026, 11, 2)`, `days[-1].date == date(2026, 11, 27)`. A bead closed on 2026-10-30, before `start`, counts on 2026-11-02.
2. Run `uv run --directory backend pytest tests/test_reports_team.py`. Expect an ImportError.
3. **Models and source.**
   - In `models.py`, add the models from Interfaces and the `ReportBead` fields. Import `date` and `Literal`.
   - In `source.py`:
     - Add `"priority"` to `_KEYS`.
     - In `read_beads`, when `raw.get("issue_type") == "milestone"` and `metadata` is a dict, copy each of `start`, `end` and `kickoff` that is a `str` into `fields`.
4. **`reports/team.py`.** Implement it with these helpers:
   - `_day(dt: datetime) -> date: return dt.astimezone().date()` (local).
   - `_iso(text: str | None) -> date | None`: `date.fromisoformat` when `re.fullmatch(r"\d{4}-\d{2}-\d{2}", text)`, else `None`.
   - `_workday(d: date) -> date`: Saturday → Friday, Sunday → Friday.
   - `_workdays(first: date, last: date) -> list[date]`: weekdays from `first` to `last` inclusive; `[]` when `first > last`. Reuse the count logic of `service._weekdays`, then derive `len()` from this list.
   - `_status(m: ReportBead, today: date) -> MilestoneStatus`: as REQ-REPORTS-008. An unreadable kickoff counts as no kickoff.
   - `_default(ms: list[TeamMilestone], today: date) -> TeamMilestone`: the four rules of REQ-REPORTS-008, in order. Ties go to the earliest `start`, then `id`; for closed milestones, the latest `end`, then `id`.
   - `_scope(tree: _Tree, beads, milestone_id) -> list[tuple[ReportBead, ReportBead]]`: (bead, nearest epic) for beads whose `issue_type` is not `epic` or `milestone` and whose lineage (`tree._lineage`) holds an epic with `parent == milestone_id` in the same project. The nearest epic is the first epic in the lineage after the bead. Sort the result by `id`.
   - `_figures(rows: list[TeamBead], last5: set[date], closed_milestone: TeamMilestone | None, span: int) -> dict[str, Any]`:
     - The dict holds the `TeamFigures` fields.
     - `throughput` is `len([r for r in closed if _workday(_day(r.closed_at)) in last5])` while open. For a closed milestone it is `round(closed / span * 5, 1)`, where `span = len(_workdays(start, closed_on))` with a minimum of 1.
     - `rework_rate` is the share of closed rows with `rework is not None` whose `rework > 0`, over those rows. It is `None` when there are none.
     - Other fields follow REQ-REPORTS-010, with `statistics.median` for `cycle_median`.
   - `build_team`:
     - `today = _day(now)`.
     - Split dated milestones from undated ones.
     - Select the milestone.
     - `tree = _Tree(beads)`.
     - Build the `TeamBead` rows:
       - `cycle_days = round(span, 1)` from `service._span(started_at, closed_at) / 1` (`_span` already returns days);
       - `age_days = round((now - (started_at or updated_at)).total_seconds() / DAY, 1)` for `in_progress`;
       - `late_days = len(_workdays(end + 1 day, _day(closed_at)))` for closed;
       - `rework`: for a bead with readable usage, `own = tree.own(bead)`, then `own.quality.reopens + own.quality.bugs`; otherwise `None`.
     - `last5` holds the last 5 entries of `_workdays(today - 14 days, today)`.
     - `members`: group by `assignee or UNASSIGNED`; sort by `(-scope, name)` with `Unassigned` last.
     - `team` adds:
       - `working_days = len(_workdays(start, end))`;
       - `elapsed = 0 if today < start else len(_workdays(start, min(today, end)))`;
       - `days_left = working_days if today < start else len(_workdays(today + 1 day, end))`;
       - `pace = round(throughput / 5, 2)`;
       - `pace_needed = None if closed or days_left == 0 else round((open + in_progress) / days_left, 2)`;
       - `late_open = open + in_progress if not closed and today > end else 0`.
     - `days` covers `_workdays(start, max(end, closed_on if closed else today))`. A close date maps through `_workday`, is clamped to the first and last day of the range, and is counted per member.
5. Run `uv run --directory backend pytest tests/test_reports_team.py`. Expect it to pass.
6. **Router tests.** Write `backend/tests/test_reports_team_api.py` with the `make`/`Clock` pattern of `test_reports_api.py` (copy the two helpers; set `Clock.now` to 2026-11-12T12:00Z). Tests:
   - `# REQ-REPORTS-008 test_reports_008_api_default_and_named`: `GET /api/reports/team?project=alpha` answers 200 with `milestone == "m2"`. With `&milestone=m1` it answers `"m1"`, and with `&milestone=gone` it answers `"m2"`.
   - `test_reports_008_api_no_milestones`: `project=beta` with no milestone rows → 200, `milestones == []`, `milestone is None`.
   - `test_reports_008_api_bad_input`: `project=nope` → 404, and `project=alpha&milestone=a b` → 422 with an `error`.
   - `test_reports_008_api_cache_and_refresh`:
     - Two GETs give the same `generated_at`, even after `clock.now += 20 s`.
     - After `POST /api/refresh` the next GET has a new `generated_at`.
     - At 61 seconds it is rebuilt.
   - `test_reports_008_api_no_process`: monkeypatch `subprocess.run` and `subprocess.Popen` to raise `AssertionError`. GET answers 200.
   - `test_reports_008_api_unreadable`: the runner raises `BeadsError("boom")`. Two GETs → 502 with `{"error": "boom"}` both times, and the runner was called twice.
7. **Router.** In `router.py`:
   - Add `_MILESTONE = re.compile(r"[A-Za-z0-9._-]{1,200}")`.
   - Add `team = KeyedCache[tuple[str, str | None], TeamReport](TTL, clock)` and `on_refresh.append(team.clear)`.
   - Add the route:
     ```python
     @router.get("/reports/team", response_model=TeamReport)
     def get_team(project: str | None = None, milestone: str | None = None) -> TeamReport | JSONResponse:
         entry = next((p for p in settings.projects if p.name == project), None)
         if entry is None or not entry.path.is_dir():
             raise HTTPException(status_code=404)
         if milestone is not None and _MILESTONE.fullmatch(milestone) is None:
             return JSONResponse(status_code=422, content={"error": "milestone may hold only letters, digits, '.', '_' and '-'"})
         try:
             return team.get(
                 (entry.name, milestone),
                 lambda: build_team(read_beads(snapshots.get(entry.path), entry.name), now=clock(), project=entry.name, milestone=milestone),
             )
         except (BeadsError, RecursionError) as exc:
             return JSONResponse(status_code=502, content={"error": _message(exc)})
     ```
   - Update the module docstring to name REQ-REPORTS-008.
8. **Delivery without work in progress.**
   - Replace `test_reports_004_work_in_progress` in `test_reports_service.py` with `# REQ-REPORTS-004 test_reports_004_no_work_in_progress`: the report of an in-progress bead dumps `delivery` without `wip` and `oldest` keys (`r.delivery.model_dump()`). Drop `WipRow` from the imports.
   - In `test_reports_api.py`, update any assertion on `delivery.wip` or `oldest` (grep for them).
   - Then remove `WipRow`, `WipBead`, `DeliverySection.wip` and `.oldest`, the `active`, `per_member` and `oldest` code in `_delivery`, and `OLDEST`.
9. Run:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expect all to pass.
10. Commit: `git commit -m "feat(reports): team report per milestone; delivery drops work in progress (gin-console-slc)"`

### Track 2: Team tab shell, URL state and Delivery cleanup
- **Dependencies**: none (builds on the JSON shape in Track 1's Interfaces, with fixtures)
- **Requirements**: REQ-REPORTS-012, REQ-REPORTS-017, REQ-UI-088, REQ-UI-090, REQ-UI-095
- **Files**:
  - Modify `frontend/src/features/reports/filters.ts:1-19` (`team` tab first and default; `milestone`, `member`, `status`)
  - Create `frontend/src/features/reports/teamApi.ts`
  - Create `frontend/src/features/reports/team/teamFixtures.ts`
  - Create `frontend/src/features/reports/team/format.ts` (working days between ISO dates, member colors)
  - Create `frontend/src/features/reports/team/TeamSection.tsx` (filters, milestone line, states, layout slots)
  - Modify `frontend/src/features/reports/ReportsPage.tsx:1-198` (team request with the late-answer guard; Team panel without the period row; Team headline)
  - Modify `frontend/src/features/reports/headlines.ts:1-53` (`teamHeadline`; Delivery figures drop "In progress now")
  - Modify `frontend/src/features/reports/api.ts:63-72,124` (drop `WipRow`, `WipBead`, `wip`, `oldest`)
  - Modify `frontend/src/features/reports/DeliverySection.tsx:83-122` (drop the "Oldest in progress" and "In progress by member" grid)
  - Modify `frontend/src/features/reports/reportFixtures.ts:26` (drop `wip`, `oldest`)
  - Test `frontend/src/features/reports/filters.test.ts`
  - Test `frontend/src/features/reports/teamApi.test.ts`
  - Test `frontend/src/features/reports/team/format.test.ts`
  - Test `frontend/src/features/reports/team/TeamSection.test.tsx`
  - Test `frontend/src/features/reports/ReportsPage.test.tsx`
  - Test `frontend/src/features/reports/headlines.test.ts`
  - Test `frontend/src/features/reports/sections.test.tsx:67-90`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** a bounded page change with written scenarios. Raised effort because the URL state has interactions (default milestone written back only on the Team tab, member validity, reset on milestone change), and two concurrent requests need the late-answer guard. Many existing page tests assume Delivery as the default.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-012, REQ-REPORTS-017, and the MODIFIED REQ-UI-088, REQ-UI-090 and REQ-UI-095, has a passing test naming its REQ.
  - `grep -rn "wip\|oldest" frontend/src/features/reports` finds nothing.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Interfaces produced (Track 3 consumes them):
```ts
// features/reports/filters.ts
export type ReportTab = "team" | "delivery" | "usage" | "quality" | "coverage";
export const TABS: readonly ReportTab[] = ["team", "delivery", "usage", "quality", "coverage"];
export type BeadStatus = "open" | "in_progress" | "closed" | "all";
export const STATUSES: readonly BeadStatus[] = ["open", "in_progress", "closed", "all"];
export type ReportFilters = {
  project: string; days: Period; sprint: string; tab: ReportTab;
  milestone: string;            // "" = server default
  member: string;               // "" = All members
  status: BeadStatus | "";      // "" = default list
};
export function parseReportSearch(search: string): ReportFilters; // tab defaults to "team"
export function reportSearch(filters: ReportFilters): string;     // ?project&days[&sprint]&tab[&milestone][&member][&status]

// features/reports/teamApi.ts — mirrors Track 1's TeamReport JSON
export type MilestoneStatus = "active" | "scheduled" | "planned" | "closed";
export type TeamMilestone = { id: string; title: string; status: MilestoneStatus; start: string; end: string; closed_on: string | null };
export type Bucket = "open" | "in_progress" | "closed";
export type TeamBead = {
  id: string; title: string; issue_type: string; status: string; bucket: Bucket; assignee: string | null;
  priority: number | null; created_at: string; epic: { id: string; title: string };
  started_at: string | null; closed_at: string | null; cycle_days: number | null; age_days: number | null;
  late_days: number | null; rework: number | null;
};
export type TeamFigures = {
  scope: number; closed: number; in_progress: number; open: number; blocked: number; unclaimed: number;
  done: number | null; throughput: number; cycle_median: number | null; oldest_in_progress: number | null;
  on_time: number | null; rework_rate: number | null; reopens: number; bugs: number;
};
export type MemberFigures = TeamFigures & { member: string };
export type TeamTotals = TeamFigures & { working_days: number; elapsed: number; days_left: number; pace: number; pace_needed: number | null; late_open: number };
export type DayRow = { date: string; closed: Record<string, number> };
export type TeamReport = {
  generated_at: string; project: string; today: string; milestones: TeamMilestone[]; undated: number;
  milestone: string | null; team: TeamTotals | null; members: MemberFigures[]; days: DayRow[]; beads: TeamBead[];
};
export const UNASSIGNED = "Unassigned";
export async function fetchTeam(project: string, milestone: string): Promise<TeamReport>; // omits milestone when ""; errors as fetchReport's `failure`
export const selectedMilestone: (report: TeamReport) => TeamMilestone | null;

// features/reports/team/format.ts
export const WARN_DAYS = 3;
export function workdaysAfter(from: string, to: string): number; // weekdays in (from, to], 0 when to <= from
export function memberColor(members: readonly string[], member: string): string; // var(--series-n) by index in `members` (cycling 1..8), muted for Unassigned
export const formatDate: (iso: string) => string; // "27 Nov"
export function lateDays(m: TeamMilestone): number; // workdaysAfter(m.end, m.closed_on) or 0

// features/reports/team/TeamSection.tsx
export function TeamSection(props: {
  project: string; report: TeamReport; filters: ReportFilters; onChange: (next: ReportFilters) => void;
}): JSX.Element; // filters row + milestone line + undated note + <div data-slot="team-body"> (Track 3 fills it)

// features/reports/headlines.ts
export function teamHeadline(report: TeamReport): Headline; // REQ-UI-095 Team rules
```

Steps:

1. **Filters.** Add tests to `filters.test.ts`, each named with its REQ:
   - `REQ-UI-095 defaults to the team tab`: `parseReportSearch("?project=a").tab === "team"`, and `?tab=nope` also gives `"team"`.
   - `REQ-REPORTS-012 parses milestone, member and status`: `?milestone=m1&member=ann&status=closed` parses, and `status=bogus` gives `""`.
   - `REQ-REPORTS-012 writes them only when set`: `reportSearch({..., tab: "team", milestone: "m2", member: "", status: ""}) === "?project=alpha&days=30&tab=team&milestone=m2"`.

   Then implement them.
2. **API client.** Write `teamApi.test.ts`:
   - `fetchTeam("alpha", "")` requests `/api/reports/team?project=alpha`, and `fetchTeam("alpha", "m1")` adds `&milestone=m1`.
   - It parses a fixture.
   - It rejects a body without `milestones` array, `beads` array or `members` array with "Could not load the team report (unexpected response)".
   - It maps 404 to "Project not found" and 502 `{error}` to that message.

   Export `failure` from `api.ts` and reuse it. Write `teamFixtures.ts` with `teamReport(overrides)`:
   - milestones `m1` (closed 2026-10-30, `closed_on` 2026-11-03), `m2` (active 2026-11-02..2026-11-27) and `m3` (planned 2026-11-30..2026-12-18);
   - `milestone: "m2"`, `today: "2026-11-12"`;
   - members `ann` and `Unassigned`;
   - 4 beads (one per bucket, plus one blocked);
   - 3 `days`.
3. **format.ts.** Test and implement:
   - `workdaysAfter("2026-11-27", "2026-12-01") === 2`;
   - `workdaysAfter("2026-11-12", "2026-11-12") === 0`;
   - `memberColor(["ann", "bao"], "bao") === "var(--series-2)"`;
   - `memberColor([...], "Unassigned") === "var(--color-muted-foreground)"`;
   - `formatDate("2026-11-27") === "27 Nov"`. Use `en-GB`, `{ day: "numeric", month: "short", timeZone: "UTC" }`.
4. **TeamSection.** Write `team/TeamSection.test.tsx` from `teamReport()`, each `it` named with its REQ:
   - `REQ-REPORTS-012`:
     - The Milestone select has optgroups Active (`m2`), Planned (`m3`) and Closed (`m1`), with `m2` selected.
     - The Member select shows "All members (2)", "ann · <scope>" and "Unassigned · <scope>".
     - Picking a member calls `onChange` with `member: "ann"`.
     - "Clear member" appears only with a member and calls `onChange` with `member: ""`.
     - Picking `m1` calls `onChange` with `milestone: "m1", member: "", status: ""`.
   - `REQ-REPORTS-012 milestone line`:
     - `m2` shows "Active", "2 Nov – 27 Nov" and "working day 9 of 20 · 11 left".
     - Closed `m1` shows "Closed · 2 d late" and "finished 3 Nov".
     - `m3` shows "Planned" and "starts in 12 working days" (2026-11-13..2026-11-30).
     - "Open Gantt" links to `milestonePath("alpha", "m2")`.
   - `REQ-REPORTS-012 undated note`: `undated: 2` shows "2 milestones without start and end dates are not listed".
   - `REQ-REPORTS-012 no period choice`: no button named "7 days" and no textbox named "Sprint".
   - `REQ-REPORTS-017 no milestones`: `teamReport({ milestones: [], milestone: null, team: null, members: [], days: [], beads: [] })` shows "alpha has no milestones yet", one sentence, and a `CopyCommand` with `gin-workflow milestone create`.

   Then implement `TeamSection`:
   - Plain `<select>` styled like the page's project select.
   - The status chip uses `Badge` (warning class `text-state-blocked` for late).
   - Reuse `CopyCommand` from `@/features/milestones/CopyCommand` and `milestonePath` from `@/features/milestones/api`.
   - Render `<div data-slot="team-body" className="flex flex-col gap-8" />` after the milestone line when `team` is not null.
5. **Page.** In `ReportsPage.test.tsx`, adjust the existing tests:
   - Extend `stub` to answer `/api/reports/team` with `teamReport()`, or a second handler argument.
   - Make `reportCalls` match `"/api/reports?"` only.
   - Tests that relied on Delivery as the default now open `?tab=delivery`.
   - Rename `REQ-UI-095 selects Delivery for an unknown tab` to `selects Team for an unknown tab`, and expect `tab-team` selected.

   Add:
   - `REQ-UI-095 headline under Team`: "27 of 64 closed · on pace" with `pace` 3.6 and `pace_needed` 3.4, and "· behind pace" with a warning icon when `pace_needed` is above `pace`.
   - `REQ-UI-095 team headline cases` (call `teamHeadline` in `headlines.test.ts` instead): closed on time "Finished on time", closed late "Finished 2 d late" with `warn`, before start "Starts 30 Nov", past end "· past end" with `warn`, and no milestones "No milestones".
   - `REQ-UI-095 requests the team report on any tab for a single project`: on `?project=alpha&tab=delivery`, one call goes to `/api/reports/team?project=alpha`. With `?project=all` none does.
   - `REQ-REPORTS-012 shared link`: `?project=alpha&tab=team&milestone=m1&member=ann&status=closed` requests `milestone=m1` and keeps `member=ann&status=closed` in the URL.
   - `REQ-REPORTS-012 writes the default milestone`: `?project=alpha&tab=team` becomes `/reports?project=alpha&days=30&tab=team&milestone=m2` (`window.location`). On `?project=alpha&tab=delivery` the URL stays without `milestone`.
   - `REQ-REPORTS-012 drops an unknown member`: `member=zed` becomes All members, and `member` leaves the URL.
   - `REQ-REPORTS-017 all projects`: `?project=all&tab=team` shows "Pick a project to see its team", and no call goes to `/api/reports/team`.
   - `REQ-REPORTS-017 failure and retry`: the first team answer is 502 `{error: "boom"}` and the second is 200. "boom" shows; Retry shows the milestone line.
   - `REQ-REPORTS-017 late answer`: hold the `m2` answer in a deferred promise, pick `m1`, resolve `m1` and then `m2`; `m1`'s line stays.
   - `REQ-UI-088 period kept across tabs`: pick 7 days on Delivery, then Team, then Quality; "7 days" is pressed.

   Implement:
   - **State:** a second `settledTeam` keyed by `JSON.stringify([selected, filters.milestone, teamAttempt])`, as `settled` is.
   - **Request:** `fetchTeam(selected, filters.milestone)` while `selected !== "" && selected !== "all"`.
   - **URL write-back:** on an ok answer, while `tab === "team"`:
     - if `report.milestone !== null && report.milestone !== filters.milestone`, call `change({ ...filters, project: selected, milestone: report.milestone })` with replace;
     - if `filters.member !== ""` and no row of `members` has it, call `change` with `member: ""`.
   - **Tab hint:** `hint` for `team` is `teamHeadline(report)` while the team answer is ok, nothing while loading, failed or `all`.
   - **Panel:**
     - `tab === "team"` renders, instead of the period row and the report body: "Pick a project to see its team" for `all`, else the loading, error-with-Retry or `<TeamSection>` states.
     - The report's error and partial-failure alerts are shown only on the other tabs.
6. **Delivery cleanup.**
   - In `sections.test.tsx`, rename the delivery test to `REQ-UI-090 delivery: weeks, ranges by type and member, no work in progress`, drop `wip` and `oldest` from its input, and assert no "Oldest in progress" or "In progress by member" heading.
   - In `headlines.test.ts`, expect delivery figures `[["Beads closed", "4"], ["Median cycle time", "0.7 d"], ["Median lead time", "—"]]`.
   - Then:
     - remove the grid at `DeliverySection.tsx:83-122` and its unused imports (`BarRows`, `formatDays` if unused);
     - remove the `["In progress now", …]` figure;
     - remove `wip` and `oldest` from `api.ts` types, `ARRAYS.delivery` and `reportFixtures.ts`.
   - The `figures` switch gets `case "team": return [];`.
7. Run:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   pnpm -C frontend build
   ```
   Expect all to pass.
8. Commit: `git commit -m "feat(reports): Team tab shell, URL state and Delivery without work in progress (gin-console-slc)"`

### Track 3: Team panel: figures, chart, member table and bead list
- **Dependencies**: Track 2
- **Requirements**: REQ-REPORTS-013, REQ-REPORTS-014, REQ-REPORTS-015, REQ-REPORTS-016
- **Files**:
  - Create `frontend/src/features/reports/team/TeamFigures.tsx` (figures row and scope-by-status bar)
  - Create `frontend/src/features/reports/team/ClosedPerDayChart.tsx`
  - Create `frontend/src/features/reports/team/MemberTable.tsx`
  - Create `frontend/src/features/reports/team/BeadTable.tsx`
  - Create `frontend/src/features/reports/team/beadSort.ts` (columns, default sort, compare)
  - Modify `frontend/src/features/reports/team/TeamSection.tsx` (render the four parts in the `team-body` slot; pass the member and status)
  - Test `frontend/src/features/reports/team/TeamFigures.test.tsx`
  - Test `frontend/src/features/reports/team/ClosedPerDayChart.test.tsx`
  - Test `frontend/src/features/reports/team/MemberTable.test.tsx`
  - Test `frontend/src/features/reports/team/BeadTable.test.tsx`
  - Test `frontend/src/features/reports/team/beadSort.test.ts`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** four presentational components with written wording and states, over types Track 2 defines. The HTML chart pattern is in `RangeChart.tsx`, and the table pattern in `DeliverySection.tsx`.
- **Acceptance criteria**:
  - Every scenario of REQ-REPORTS-013 to REQ-REPORTS-016 has a passing test naming its REQ.
  - The layout and wording match `docs/specs/reports/assets/2026-11-12/mockup/index.html`, without its "Mockup controls" bar and "Mockup note".
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// team/TeamFigures.tsx
export function TeamFigures(props: { team: TeamTotals; member: MemberFigures | null; milestone: TeamMilestone }): JSX.Element;
// team/ClosedPerDayChart.tsx
export function ClosedPerDayChart(props: { days: DayRow[]; members: string[]; selected: string; today: string; milestone: TeamMilestone }): JSX.Element | null;
// team/MemberTable.tsx
export function MemberTable(props: { members: MemberFigures[]; selected: string; onSelect: (member: string) => void }): JSX.Element;
// team/BeadTable.tsx
export function BeadTable(props: {
  project: string; beads: TeamBead[]; member: string; status: BeadStatus; onStatus: (s: BeadStatus) => void; today: string;
}): JSX.Element;
// team/beadSort.ts
export type Column = "bead" | "epic" | "type" | "assignee" | "priority" | "status" | "age" | "progress" | "closed" | "cycle" | "on_time" | "rework";
export const COLUMNS: Record<BeadStatus, Column[]>;
export const DEFAULT_SORT: Record<BeadStatus, { column: Column; dir: 1 | -1 }>; // open: priority 1; in_progress: progress -1; closed: closed -1; all: status 1
export function sortBeads(beads: TeamBead[], column: Column, dir: 1 | -1, today: string): TeamBead[]; // stable; null last; open ties: oldest first
```

Steps:

1. **TeamFigures.** Write `TeamFigures.test.tsx` from Track 2's `teamReport()`:
   - `REQ-REPORTS-013 behind pace`: `pace` 2.0 and `pace_needed` 3.4 → "2.0 / day" and "needs 3.4 / day to end on 27 Nov", both inside elements with the class `text-state-blocked`.
   - `REQ-REPORTS-013 member figures`: a member row with `scope` 11, `closed` 6 and `blocked` 1 → "6 / 11", "55% of assigned", "1 blocked", a "Throughput" label and no "Pace".
   - `REQ-REPORTS-013 closed milestone`: `throughput` 13.2 and `on_time` 0.88 → "13.2 / week", and "88%" in the warning class.
   - `REQ-REPORTS-013 in progress and open`:
     - "oldest 4.9 d" in the warning class above 3, and "nothing started" when `oldest_in_progress` is null;
     - "3 blocked · 8 unclaimed";
     - "4 still open after end" when `late_open` is 4, else "closed by 27 Nov";
     - "—" for a null `cycle_median` or `rework_rate`.
   - `REQ-REPORTS-013 scope bar`: four segments with `aria-label` "27 closed, 10 in progress, 24 open, 3 blocked" and a legend with those counts.

   Implement it as a bordered grid of seven cells (CSS grid `repeat(auto-fit,minmax(150px,1fr))`). Color the segments with the tokens in `frontend/src/index.css`: Closed `bg-state-ready`, In progress `bg-state-progress`, Open `bg-muted-foreground/40`, and Blocked a `bg-state-blocked` stripe (`repeating-linear-gradient`, as in the mockup), and `formatPercent` and `formatDays` from `../format`.
2. **ClosedPerDayChart.** Build it in HTML and CSS, as `RangeChart.tsx` does, not with Recharts. That gives keyboard focus and a tooltip on hover and focus without a chart library, and it renders in jsdom. Write `ClosedPerDayChart.test.tsx`:
   - `REQ-REPORTS-014 stacked day`: `days` holds `{date: "2026-11-04", closed: {ann: 2, bao: 1}}`.
     - That day's column is an `li` with `tabIndex=0` and `aria-label` "4 Nov: ann 2, bao 1, total 3".
     - It holds a `role="tooltip"` element with those lines.
   - `REQ-REPORTS-014 not started`: `milestone.start` "2026-11-30" and `today` "2026-11-12" → renders nothing.
   - `REQ-REPORTS-014 markers`: an active milestone shows the text "Today" on the `today` column. A closed milestone whose `days` pass `end` shows "End 30 Oct" on the `end` column.
   - `REQ-REPORTS-014 faded`: with `selected="ann"`, `bao`'s segments have the class `opacity-20`, and `ann`'s do not.
   - `REQ-REPORTS-014 legend`: one legend item per member with a closed bead, in `members` order.

   Implement it as follows:
   - **Axis:** a y-axis of 0..max, with 4 grid lines, where max is the largest daily total and at least 4.
   - **Columns:** an `ol` of one `li` per day. Each `li` is a flex column of segments, one per member in `members` order, with `height = n / max * 100%` and `background: memberColor(members, m)`.
   - **Labels:** a date label under each Monday and under the first day.
   - **Tooltip:** a `role="tooltip"` span shown with `group-hover:block group-focus:block`, as in `RangeChart.tsx:26-40`.
   - **Markers:** a dashed left border with a label on the Today column and the End column.
   - **Future days:** a day after `today` on an open milestone gets no segments, only its baseline.
3. **MemberTable.** Write `MemberTable.test.tsx`:
   - `REQ-REPORTS-015 columns`: rows `ann` and `Unassigned` show assigned, closed, in progress, open with "(1 blocked)", a done meter with "55%", per week "4.0", median cycle "1.1 d", oldest "4.9 d" in the warning class, on time "100%", and rework "—" for Unassigned.
   - `REQ-REPORTS-015 filter from the table`: clicking `ann`'s row calls `onSelect("ann")`, and Enter or Space on the focused row does the same.
   - `REQ-REPORTS-015 clear from the table`: with `selected="ann"`, clicking it calls `onSelect("")`, and the row has `aria-selected="true"` and the `bg-muted` class.

   Implement it with `Table` from `@/components/ui/table`. Rows get `tabIndex={0}`.
4. **beadSort and BeadTable.** Test `beadSort.ts`:
   - open default: priority ascending, then the oldest `created_at` first;
   - in progress: `age_days` descending;
   - closed: `closed_at` descending;
   - nulls last in both directions.

   Write `BeadTable.test.tsx`:
   - `REQ-REPORTS-016 counts follow the member`: `ann` has 4 open, 1 in-progress and 6 closed beads → tabs "Open 4", "In progress 1", "Closed 6" and "All 11" with `member="ann"`, and the heading "Beads · ann".
   - `REQ-REPORTS-016 closed row`: `a-3` has cycle 0.9, `late_days` 2 and `rework` null → "0.9 d", "2 d late" and "—", and the title link goes to `/beads/alpha/a-3`. The epic links to `/beads/alpha/<epic>`.
   - `REQ-REPORTS-016 show more`: 43 closed beads show 15 rows; pressing "Show 15 more" shows 30.
   - `REQ-REPORTS-016 sort`: on the Open list, pressing "Age" twice gives `aria-sort="descending"`, with the rows by age, oldest last.
   - `REQ-REPORTS-016 columns per status`: the headers per list are:
     - Open: Bead, Epic, Type, Assignee, Priority, Status, Age;
     - In progress: Bead, Epic, Type, Assignee, In progress for;
     - Closed: Bead, Epic, Type, Assignee, Closed, Cycle, On time, Rework;
     - All: Bead, Epic, Type, Assignee, Status.

     "In progress for" above 3 d is in the warning class. The chips read Open, Blocked, or the raw status otherwise.
   - `REQ-REPORTS-016 empty`: no in-progress beads for `ann` → "No in progress beads for ann in this milestone".

   Implement `BeadTable`:
   - The status tab list uses `Tabs` from `@/components/Tabs`, with `label="Bead status"` and hint-free labels `Open 4`.
   - Rows show 15 at a time; the count resets when the status, member or sort changes.
   - Age is days from `created_at` to `today`, computed in `beadSort.ts` as `ageOf(bead, today)`.
5. **Wire them in TeamSection.** In the `team-body` slot, render:
   - `TeamFigures` with `member = members.find(m => m.member === filters.member) ?? null`;
   - `ClosedPerDayChart` with `members.map(m => m.member)`;
   - `MemberTable`, whose `onSelect` calls `onChange({ ...filters, member })`;
   - `BeadTable` with:
     - `beads` filtered by `(b.assignee ?? UNASSIGNED) === filters.member` when a member is set;
     - `status = filters.status || (milestone.status === "closed" ? "closed" : "open")`;
     - `onStatus` calling `onChange({ ...filters, status })`.

   Add one `TeamSection.test.tsx` case: `REQ-REPORTS-012 change milestone resets the list` — after `onChange` with `m1`, re-rendering with `filters.status ""` and a closed `m1` shows the Closed list selected.
6. Run:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   pnpm -C frontend build
   ```
   Expect all to pass.
7. Commit: `git commit -m "feat(reports): Team figures, chart, member table and bead list (gin-console-slc)"`

### Track 4: QA cases
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-004, REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-011, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-014, REQ-REPORTS-015, REQ-REPORTS-016, REQ-REPORTS-017, REQ-UI-088, REQ-UI-090, REQ-UI-095
- **Files**:
  - Create `qa/cases/reports/` (case files for the ADDED REQs and REQ-REPORTS-004)
  - Modify or create `qa/cases/ui/` (cases for REQ-UI-088, REQ-UI-090, REQ-UI-095)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI, which hands out IDs and pins.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-slc` prints `ok`, and `gin-qa cases check` reports no new finding.
- **Estimated complexity**: low

Steps:

1. Run `gin-qa cases plan --change gin-console-slc --format json`, and read `qa/guidelines.md` for the types (`e2e`, `api`, `manual`) and `Priority: high | medium | low`.
2. For each `missing` scenario, run `gin-qa cases new <capability> --type <type> --title "<title>" --req <REQ-ID>`, then fill in Preconditions, Steps and Expected:
   - use `api` for REQ-REPORTS-004 and REQ-REPORTS-008 to REQ-REPORTS-011;
   - use `e2e` for REQ-REPORTS-012 to REQ-REPORTS-017 and the REQ-UI ones;
   - make the default milestone, pace, member filter and late answer `high` priority, and the rest `medium`.
3. For each `stale` case, update it to the new REQ text, then run `gin-qa cases pin <TC-ID>`.
4. Repeat `gin-qa cases check --change gin-console-slc` until it prints `ok`.
5. Commit: `git commit -m "test(qa): cases for the Team tab (gin-console-slc)"`

### Track 5: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 6
- **Requirements**: REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-014, REQ-REPORTS-015, REQ-REPORTS-016, REQ-UI-095
- **Files**:
  - Modify `docs/changes/gin-console-slc-team-tab/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result.
- **Human gate**: the user walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 is recorded as `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. Deploy as the deploy memory records, running each as a separate command:
   - `git -C /home/gin/gin-fam/gin-console merge --ff-only feat/gin-console-slc-team-tab` (on the checked-out branch that Track 5 runs from)
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`, retrying for up to 12 seconds; it should answer `200`.
   - Report the rollback command.
2. Ask the user to walk TC-1 and write the result into `05-tests.md`.

TC-1 (manual), as in `05-tests.md`:
- `/reports?project=qwikfone` opens the Team tab on "Backlog Remediation — Nov 2026". That milestone has no kickoff, so the default comes from the "period holds today" rule.
- In light, dark and at 400 px wide, the layout and wording match the mockup.
- Pressing a member row filters the figures, the chart highlight and the list.
- `pgrep -fa "bd \|gin "` shows nothing started by opening the tab after a Refresh.

### Track 6: Age sort puts the oldest first when descending
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-016
- **Files**:
  - Modify `frontend/src/features/reports/team/beadSort.ts` (Age sorts by `ageOf`, not `-ageOf`)
  - Test `frontend/src/features/reports/team/beadSort.test.ts`
  - Test `frontend/src/features/reports/team/BeadTable.test.tsx` (REQ-REPORTS-016 sort scenario)
  - Modify `qa/cases/reports/TC-REPORTS-039-sort.e2e.md` (Expected: oldest first; re-pin)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** a one-line sort key change with its tests and QA case, after the user approved correcting the REQ-REPORTS-016 sort scenario on 2026-11-12 (it read "descending, oldest last").
- **Acceptance criteria**:
  - Pressing Age once sorts ascending (newest first); pressing it again gives `aria-sort="descending"` with the oldest bead first, tested with REQ-REPORTS-016 in the name.
  - `gin-qa cases check --change gin-console-slc` prints `ok`.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: low

Steps:

1. In `BeadTable.test.tsx`, change the REQ-REPORTS-016 sort test: after two presses on Age, `aria-sort="descending"` and the first row is the oldest bead. In `beadSort.test.ts`, sorting by `age` with `dir` 1 puts the newest first. Run `pnpm -C frontend test --run src/features/reports/team`; expect failures.
2. In `beadSort.ts`, sort Age by `ageOf(bead, today)` and drop the comment about the creation-date ordering. Run the tests; expect them to pass.
3. Update `TC-REPORTS-039-sort.e2e.md` to the corrected scenario, run `gin-qa cases pin TC-REPORTS-039` if asked, and `gin-qa cases check --change gin-console-slc` until `ok`.
4. Run the full frontend checks, then commit: `git commit -m "fix(reports): Age descending puts the oldest bead first (gin-console-slc)"`

## Integration
- **Branch**: `feat/gin-console-slc-team-tab`
- **Merge strategy**: parallel-then-merge. Tracks 1, 2 and 4 merge in any order, Track 3 after Track 2, and Track 5 deploys the merged branch.

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass
- [ ] `gin specs lint --change gin-console-slc --against master` prints `ok`, and `gin specs trace --change gin-console-slc` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-slc` prints `ok`
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- The Parent Bead `gin-console-slc` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- The user may override `Model:` and `Effort:` before approving the plan.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval, with no push until the epic is done.

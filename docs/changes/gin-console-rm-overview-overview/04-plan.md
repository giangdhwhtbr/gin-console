# Plan: Overview for leads

Epic: gin-console-rm-overview
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder.

## Objective

One morning page at `/` across every project: attention lists, milestone verdicts, and work in progress per member.

Architecture: `GET /api/overview` builds the bead lists from snapshots in a new backend context; the page then loads verdicts, forecasts, and gates from endpoints that exist.

Tech stack: FastAPI, pydantic, pytest, ruff, mypy strict; React 19, Tailwind 4, vitest; Playwright with gin-qa.

Done when every scenario of the ADDED and MODIFIED REQs has a test naming its REQ, all checks in Validation pass, and TC-1 passes on the Tailscale build.

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
- **Problem statement:** no cross-project view; blockers are buried in each project.
- **Success criteria:** those of `01-proposal.md`.
- **Global constraints** (from the spec):
  - The console stays read-only; "The page SHALL hold no control that changes a project or a bead."
  - `GET /api/overview` "SHALL NOT start any process".
  - At most 4 workflow requests are open at any time.
  - Polling every 10 seconds requests only `/api/overview`, plus gates and verdicts of names not seen before.
  - Every count of blocked beads follows REQ-BEADS-021; an assignee is never the `owner` (REQ-UI-135); a person is the REQ-BEADS-023 handle.
  - Days are working days; `aging` means above `aging_days`.
  - Reports results do not change.
  - No page sideways scroll at 360px; text only at 12, 13, 14, 16, 20, 28 and 40px (REQ-UI-137).
- **Non-goals:** notifications, gates of ready epics, gate history, filters, a scheduled gin refresh.

## Approach Options
### Option 1: Backend context, then frontend data, page, shell, QA
- Summary: five tracks; the page is wired into the shell last.
- Pros: each track has its own tests; the old `/` keeps working until Track 4.
- Cons: the page is reachable only after Track 4.

### Option 2: One backend and one frontend track
- Summary: fewer handoffs.
- Pros: less coordination.
- Cons: the frontend diff mixes rules, page, and shell changes, and is hard to reject in parts.

### Recommended Approach
- Selected option: Option 1.
- Rationale: small reviewable tracks; Tracks 1 and 2 share no file.

## Scope
- In scope: REQ-OVERVIEW-001 to 011, REQ-CONFIG-007, and the MODIFIED REQs of `ui`, `beads`, `milestone-ui`.
- Out of scope: the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (frontend data) share no file and run together; Tracks 3, 4 and 5 follow their dependencies.
```

## Tasks

### Track 1: Backend overview and config
- **Dependencies**: none
- **Requirements**: REQ-OVERVIEW-001, REQ-OVERVIEW-002, REQ-OVERVIEW-003, REQ-OVERVIEW-004, REQ-OVERVIEW-005, REQ-OVERVIEW-006, REQ-CONFIG-007
- **Files**:
  - Create `backend/src/gin_console/overview/__init__.py`
  - Create `backend/src/gin_console/overview/models.py`
  - Create `backend/src/gin_console/overview/service.py`
  - Create `backend/src/gin_console/overview/router.py`
  - Modify `backend/src/gin_console/config.py:37-90` (settings)
  - Modify `backend/src/gin_console/app.py:86-92` (include the router)
  - Modify `backend/src/gin_console/reports/status.py:102-113` (rename `_wait` to `wait`)
  - Modify `backend/src/gin_console/reports/status.py:278-300` (rename `_blocker` to `blocker_of`)
  - Modify `backend/src/gin_console/reports/scope.py:117-147` (rename `_tracked` to `tracked`)
  - Modify `config.example.yaml`
  - Modify `README.md`
  - Test `backend/tests/test_overview_service.py`
  - Test `backend/tests/test_overview_api.py`
  - Test `backend/tests/test_config.py`
  - Test `backend/tests/test_counts_agree.py`
- **Interfaces**: produces `GET /api/overview` as the models below, `build_overview(snapshot, name, aging_days, now, stale) -> ProjectOverview`, and `Settings.overview.aging_days: int`. Consumes `SnapshotStore`, `read_beads`, `Tree`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one new context with the rules given below; edge cases are listed in the spec scenarios.
- **Acceptance criteria**: every scenario of the Requirements has a passing test; Reports tests keep their expected values; ruff and mypy pass.
- **Estimated complexity**: medium

Steps:

1. Config test in `backend/tests/test_config.py` (the file already has `write` and imports `ConfigError`, `load_settings`):
   ```python
   # REQ-CONFIG-007
   def test_config_007_aging_days_default_and_set(tmp_path: Path) -> None:
       assert load_settings(write(tmp_path, "projects: []\n")).overview.aging_days == 3
       text = "overview: {aging_days: 5}\n"
       assert load_settings(write(tmp_path, text)).overview.aging_days == 5

   @pytest.mark.parametrize("value", ["0", "-1", "2.5", "'3'", "true", "abc"])
   def test_config_007_invalid_aging_days(tmp_path: Path, value: str) -> None:
       path = write(tmp_path, f"overview: {{aging_days: {value}}}\n")
       with pytest.raises(ConfigError, match=r"overview\.aging_days"):
           load_settings(path)
   ```
   Run `uv run --directory backend pytest tests/test_config.py -k config_007`; expect failures. Add to `config.py` (import `StrictInt`), then rerun; expect pass:
   ```python
   class OverviewSettings(BaseModel):
       model_config = ConfigDict(extra="forbid")

       # working days in progress before a bead is listed (REQ-CONFIG-007)
       aging_days: StrictInt = Field(default=3, ge=1)
   ```
   and in `Settings`: `overview: OverviewSettings = Field(default_factory=OverviewSettings)`.
2. Rename the three Reports helpers in place and at their call sites (`status.py:113`, `status.py:300`, `scope.py:131`, `scope.py:147`). Run `uv run --directory backend pytest tests -k reports`; expect pass with no test edited.
3. Write `backend/tests/test_overview_service.py`, one test per scenario of REQ-OVERVIEW-002 to 006. Start with these and add the rest with the same helper:
   ```python
   from datetime import UTC, datetime
   from typing import Any

   from fake_export import bead, dep

   from gin_console.beads.snapshot import build_snapshot
   from gin_console.overview.models import ProjectOverview
   from gin_console.overview.service import build_overview

   NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)  # a Friday


   def overview(rows: list[dict[str, Any]], now: datetime = NOW) -> ProjectOverview:
       return build_overview(build_snapshot(rows), "alpha", aging_days=3, now=now, stale=False)


   def child(ident: str, parent: str, **fields: Any) -> dict[str, Any]:
       return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **fields)


   def test_overview_003_above_the_threshold() -> None:
       found = overview(
           [
               bead("a", status="in_progress", started_at="2026-11-16T10:00:00Z"),
               bead("b", status="in_progress", started_at="2026-11-18T10:00:00Z"),
           ]
       )
       assert [(b.id, b.days) for b in found.aging] == [("a", 4)]


   def test_overview_002_blocked_through_its_parent() -> None:
       found = overview(
           [
               bead("a-1", assignee="bao@example.com"),
               bead("e-1", issue_type="epic", dependencies=[dep("e-1", "a-1", "blocks")]),
               child("e-1.1", "e-1"),
           ]
       )
       assert {b.id: b.blocker.id if b.blocker else None for b in found.blocked} == {
           "e-1": "a-1",
           "e-1.1": "a-1",
       }
       assert all(b.blocker and b.blocker.person == "bao" for b in found.blocked)


   def test_overview_004_owner_is_not_assignee_and_split_epic_left_out() -> None:
       found = overview(
           [
               bead("e-1", issue_type="epic"),
               child("e-1.1", "e-1", owner="lead@example.com"),
               bead("t-2", assignee="ann"),
           ]
       )
       assert [b.id for b in found.unassigned] == ["e-1.1"]


   def test_overview_006_overdue_never_kicked_off_comes_first() -> None:
       found = overview(
           [
               bead(
                   "m1",
                   issue_type="milestone",
                   metadata={"start": "2026-11-02", "end": "2026-11-19"},
               ),
               bead(
                   "m2",
                   issue_type="milestone",
                   metadata={
                       "start": "2026-11-09",
                       "end": "2026-12-18",
                       "kickoff": "2026-11-09",
                   },
               ),
           ]
       )
       assert found.milestone is not None and found.milestone.id == "m1"
   ```
   The rest: wait days and blocker person, status-only blocked with `blocker` null, prep and merge gate left out of every list, weekend, blocked and split epic left out of `aging` and `in_progress`, no `started_at`, order by priority then id, closed-only and no milestone, two overdue milestones, undated milestone, `epics` by id.
   Run `uv run --directory backend pytest tests/test_overview_service.py`; expect an import error.
4. Write `models.py`:
   ```python
   from datetime import datetime

   from pydantic import BaseModel, Field

   from gin_console.reports.models import Blocker


   class BlockedBead(BaseModel):
       id: str
       title: str
       assignee: str | None
       days: int
       blocker: Blocker | None


   class AgingBead(BaseModel):
       id: str
       title: str
       assignee: str | None
       days: int


   class ReadyBead(BaseModel):
       id: str
       title: str
       priority: int | None


   class ActiveBead(BaseModel):
       id: str
       title: str
       assignee: str | None


   class Named(BaseModel):
       id: str
       title: str


   class ProjectOverview(BaseModel):
       name: str
       error: str | None = None
       stale: bool = False
       milestone: Named | None = None
       blocked: list[BlockedBead] = Field(default_factory=list)
       aging: list[AgingBead] = Field(default_factory=list)
       unassigned: list[ReadyBead] = Field(default_factory=list)
       in_progress: list[ActiveBead] = Field(default_factory=list)
       epics: list[Named] = Field(default_factory=list)


   class Overview(BaseModel):
       generated_at: datetime
       aging_days: int
       projects: list[ProjectOverview]
   ```
   Write `service.py`:
   ```python
   """What needs a lead's attention in one project (REQ-OVERVIEW-002 to REQ-OVERVIEW-006)."""

   from datetime import date, datetime, timedelta

   from gin_console.beads.definitions import person_key
   from gin_console.beads.milestones import current_milestone
   from gin_console.beads.prep import is_prep
   from gin_console.beads.snapshot import Snapshot
   from gin_console.overview.models import (
       ActiveBead,
       AgingBead,
       BlockedBead,
       Named,
       ProjectOverview,
       ReadyBead,
   )
   from gin_console.reports.models import ReportBead
   from gin_console.reports.scope import Tree, day_of, list_milestones, tracked, workdays
   from gin_console.reports.source import read_beads
   from gin_console.reports.status import blocker_of, wait

   LAST = 1_000_000  # a bead without priority sorts last


   def _milestone(beads: list[ReportBead], today: date) -> Named | None:
       opened = [m for m in list_milestones(beads, today)[0] if m.status != "closed"]
       overdue = sorted((m for m in opened if m.end < today), key=lambda m: (m.end, m.id))
       found = overdue[0] if overdue else current_milestone(opened, today)
       return None if found is None else Named(id=found.id, title=found.title)


   def _age(bead: ReportBead, today: date) -> int:
       since = day_of(bead.started_at or bead.updated_at)
       return len(workdays(since + timedelta(days=1), today))


   def build_overview(
       snapshot: Snapshot, name: str, aging_days: int, now: datetime, stale: bool
   ) -> ProjectOverview:
       beads = read_beads(snapshot, name, {})
       tree, today = Tree(beads), day_of(now)
       work = [b for b in beads if b.issue_type != "milestone" and not is_prep(b.labels)]
       waits = [(b, wait(tree, b, today)) for b in work if b.blocked]
       waits.sort(key=lambda pair: (-pair[1], pair[0].id))
       single = [b for b in beads if tracked(tree, b) and not b.blocked]
       active = sorted((b for b in single if b.status == "in_progress"), key=lambda b: b.id)
       ages = [(b, _age(b, today)) for b in active]
       ages.sort(key=lambda pair: (-pair[1], pair[0].id))
       ready = [b for b in single if b.id in snapshot.ready and person_key(b.assignee) is None]
       ready.sort(key=lambda b: (LAST if b.priority is None else b.priority, b.id))
       epics = sorted(
           (b for b in beads if b.issue_type == "epic" and b.status == "in_progress"),
           key=lambda b: b.id,
       )
       return ProjectOverview(
           name=name,
           stale=stale,
           milestone=_milestone(beads, today),
           blocked=[
               BlockedBead(
                   id=b.id,
                   title=b.title,
                   assignee=b.assignee,
                   days=days,
                   blocker=blocker_of(tree, b),
               )
               for b, days in waits
           ],
           aging=[
               AgingBead(id=b.id, title=b.title, assignee=b.assignee, days=days)
               for b, days in ages
               if days > aging_days
           ],
           unassigned=[ReadyBead(id=b.id, title=b.title, priority=b.priority) for b in ready],
           in_progress=[ActiveBead(id=b.id, title=b.title, assignee=b.assignee) for b in active],
           epics=[Named(id=b.id, title=b.title) for b in epics],
       )
   ```
   Rerun step 3; expect pass.
5. Write `backend/tests/test_overview_api.py` with `TestClient(create_app(Settings(projects=...), static_dir=..., run_gw=FakeGw(), run_bd=FakeBd(), run_epic_workflow=<a function that fails the test>, clock=...))` and `write_export`: no process and config order (both runners' `calls` empty), one unreadable project, a missing directory, no projects (`projects == []`), `aging_days` from settings, `stale`. Run; expect 404 failures. Write `router.py`:
   ```python
   """GET /api/overview (REQ-OVERVIEW-001): every project's snapshot, no process started."""

   from collections.abc import Callable
   from datetime import datetime

   from fastapi import APIRouter

   from gin_console.beads.errors import BeadsError
   from gin_console.beads.snapshot import SnapshotStore
   from gin_console.config import ProjectEntry, Settings
   from gin_console.overview.models import Overview, ProjectOverview
   from gin_console.overview.service import build_overview


   def build_router(
       settings: Settings, snapshots: SnapshotStore, clock: Callable[[], datetime]
   ) -> APIRouter:
       router = APIRouter()
       aging_days = settings.overview.aging_days

       def one(entry: ProjectEntry, now: datetime) -> ProjectOverview:
           if not entry.path.is_dir():
               return ProjectOverview(
                   name=entry.name, error=f"directory does not exist: {entry.path}"
               )
           try:
               snapshot = snapshots.get(entry.path)
               return build_overview(
                   snapshot, entry.name, aging_days, now, snapshots.is_stale(entry.path)
               )
           except (BeadsError, RecursionError) as exc:
               return ProjectOverview(
                   name=entry.name, error=str(exc) or "issues.jsonl was too deeply nested"
               )

       @router.get("/overview")
       def get_overview() -> Overview:
           now = clock()
           return Overview(
               generated_at=now,
               aging_days=aging_days,
               projects=[one(entry, now) for entry in settings.projects],
           )

       return router
   ```
   In `app.py` import `build_router as build_overview_router` from `gin_console.overview.router` and add `api.include_router(build_overview_router(settings, snapshots, clock))` after the projects router. Rerun; expect pass.
6. In `test_counts_agree.py`, extend `test_beads_021_blocked_counts_agree` so that `len(build_overview(snapshot, "alpha", 3, NOW, False).blocked) == counted.blocked`.
7. Document `overview.aging_days` in `config.example.yaml` (commented, as `beads`) and in `README.md` after the pull settings, with the note that older installs refuse the key.
8. Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .`, `uv run --directory backend mypy`; expect all pass. Commit `feat(overview): overview endpoint and aging setting (gin-console-rm-overview)`.

### Track 2: Frontend data and rules
- **Dependencies**: none
- **Requirements**: REQ-OVERVIEW-005, REQ-OVERVIEW-008, REQ-BEADS-023
- **Files**:
  - Create `frontend/src/features/overview/api.ts`
  - Create `frontend/src/features/overview/gates.ts`
  - Create `frontend/src/features/overview/workload.ts`
  - Create `frontend/src/features/overview/merge.ts`
  - Create `frontend/src/features/overview/useKeyed.ts`
  - Test `frontend/src/features/overview/api.test.ts`
  - Test `frontend/src/features/overview/gates.test.ts`
  - Test `frontend/src/features/overview/workload.test.ts`
  - Test `frontend/src/features/overview/merge.test.ts`
  - Test `frontend/src/features/overview/useKeyed.test.tsx`
- **Interfaces**: produces `fetchOverview(): Promise<Overview>`, the types below, `gateIssues`, `waiversOf`, `workloadOf`, `blockedRows`, `agingRows`, `unassignedRows`, and `useKeyed`. Consumes `EpicWorkflow` (`@/features/projects/api`) and `personOf`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** small pure modules and one hook with bounded concurrency, with the code given.
- **Acceptance criteria**: the tests below pass; no more than `limit` requests are open; an asked key is never asked again.
- **Estimated complexity**: medium

Steps:

1. Write `gates.test.ts` for the REQ-OVERVIEW-008 scenarios "Started before its plan" and "Waivers", plus any gate `unknown`, then run `pnpm -C frontend test --run src/features/overview`; expect failure. Write `gates.ts`:
   ```ts
   import type { EpicWorkflow } from "@/features/projects/api";

   const ENTRY = ["requirement_confirmed", "plan_approved", "orchestration_ready"];

   /** REQ-OVERVIEW-008: the entry gates still unmet and any gate that could not be read. */
   export function gateIssues(workflow: EpicWorkflow): string[] {
     return Object.entries(workflow.gates)
       .filter(([name, value]) => value === "unknown" || (value === "unmet" && ENTRY.includes(name)))
       .map(([name, value]) => (value === "unknown" ? `${name} (unknown)` : name));
   }

   export type WaiverItem = { subject: string; reason: string };

   const reasonOf = (value: string): string => /^waived\((.*)\)$/s.exec(value)?.[1] ?? "";

   /** REQ-OVERVIEW-008: the waived gates, then the review waivers. */
   export function waiversOf(workflow: EpicWorkflow): WaiverItem[] {
     return [
       ...Object.entries(workflow.gates)
         .filter(([, value]) => value.startsWith("waived"))
         .map(([name, value]) => ({ subject: name, reason: reasonOf(value) })),
       ...workflow.review_waivers.map((w) => ({ subject: w.task_id, reason: w.reason })),
     ];
   }
   ```
   Rerun; expect pass.
2. Write `api.test.ts` (valid body, malformed body, HTTP error) and `api.ts`:
   ```ts
   import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

   export type Blocker = { id: string; title: string; person: string; blocked: boolean };
   export type Named = { id: string; title: string };
   export type ActiveBead = Named & { assignee: string | null };
   export type AgingBead = ActiveBead & { days: number };
   export type BlockedBead = AgingBead & { blocker: Blocker | null };
   export type ReadyBead = Named & { priority: number | null };
   export type ProjectOverview = {
     name: string;
     error: string | null;
     stale: boolean;
     milestone: Named | null;
     blocked: BlockedBead[];
     aging: AgingBead[];
     unassigned: ReadyBead[];
     in_progress: ActiveBead[];
     epics: Named[];
   };
   export type Overview = { generated_at: string; aging_days: number; projects: ProjectOverview[] };

   const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
   const isNamed = (value: unknown): value is object => isObject(value) && isString(field(value, "id")) && isString(field(value, "title"));
   const isActive = (value: unknown): value is object => isNamed(value) && isStringOrNull(field(value, "assignee"));
   const isAging = (value: unknown): value is object => isActive(value) && isFiniteNumber(field(value, "days"));
   const isBlocker = (value: unknown) => value === null || (isNamed(value) && isString(field(value, "person")));
   const isBlocked = (value: unknown) => isAging(value) && isBlocker(field(value, "blocker"));
   const isReady = (value: unknown) => isNamed(value) && (field(value, "priority") === null || isFiniteNumber(field(value, "priority")));
   const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);

   function isProject(value: unknown): boolean {
     return (
       isObject(value) &&
       isString(field(value, "name")) &&
       isStringOrNull(field(value, "error")) &&
       typeof field(value, "stale") === "boolean" &&
       (field(value, "milestone") === null || isNamed(field(value, "milestone"))) &&
       every(field(value, "blocked"), isBlocked) &&
       every(field(value, "aging"), isAging) &&
       every(field(value, "unassigned"), isReady) &&
       every(field(value, "in_progress"), isActive) &&
       every(field(value, "epics"), isNamed)
     );
   }

   function isOverview(value: unknown): value is Overview {
     return isObject(value) && isString(field(value, "generated_at")) && isFiniteNumber(field(value, "aging_days")) && every(field(value, "projects"), isProject);
   }

   export async function fetchOverview(): Promise<Overview> {
     const response = await fetch("/api/overview");
     if (!response.ok) throw new Error(`Could not load the overview (HTTP ${response.status})`);
     const body: unknown = await response.json();
     if (!isOverview(body)) throw new Error("Could not load the overview (unexpected response)");
     return body;
   }
   ```
3. Write `workload.test.ts` (REQ-OVERVIEW-005 scenarios and the name tie) and `workload.ts`:
   ```ts
   import { personOf } from "@/lib/people";
   import type { ActiveBead, ProjectOverview } from "./api";

   export type Workload = { person: string | null; total: number; perProject: { project: string; count: number }[]; beads: { project: string; bead: ActiveBead }[] };

   /** REQ-OVERVIEW-005: one row per person across projects, highest total first, Unassigned last. */
   export function workloadOf(projects: readonly ProjectOverview[]): Workload[] {
     const people = new Map<string | null, { project: string; bead: ActiveBead }[]>();
     for (const project of projects) {
       for (const bead of project.in_progress) {
         const person = personOf(bead.assignee);
         people.set(person, [...(people.get(person) ?? []), { project: project.name, bead }]);
       }
     }
     return [...people.entries()]
       .map(([person, beads]) => {
         const counts = new Map<string, number>();
         for (const { project } of beads) counts.set(project, (counts.get(project) ?? 0) + 1);
         return { person, total: beads.length, perProject: [...counts].map(([project, count]) => ({ project, count })), beads };
       })
       .sort((a, b) => Number(a.person === null) - Number(b.person === null) || b.total - a.total || (a.person ?? "").localeCompare(b.person ?? ""));
   }
   ```
4. Write `merge.test.ts` (order across two projects, ties by id then project) and `merge.ts`:
   ```ts
   import type { AgingBead, BlockedBead, ProjectOverview, ReadyBead } from "./api";

   export type Row<T> = { project: string; bead: T };

   const byId = (a: Row<{ id: string }>, b: Row<{ id: string }>) => a.bead.id.localeCompare(b.bead.id) || a.project.localeCompare(b.project);
   const byWait = (a: Row<AgingBead>, b: Row<AgingBead>) => b.bead.days - a.bead.days || byId(a, b);
   const rowsOf = <T,>(projects: readonly ProjectOverview[], pick: (project: ProjectOverview) => T[]): Row<T>[] =>
     projects.flatMap((project) => pick(project).map((bead) => ({ project: project.name, bead })));

   export const blockedRows = (projects: readonly ProjectOverview[]): Row<BlockedBead>[] => rowsOf(projects, (p) => p.blocked).sort(byWait);
   export const agingRows = (projects: readonly ProjectOverview[]): Row<AgingBead>[] => rowsOf(projects, (p) => p.aging).sort(byWait);
   export const unassignedRows = (projects: readonly ProjectOverview[]): Row<ReadyBead>[] =>
     rowsOf(projects, (p) => p.unassigned).sort((a, b) => (a.bead.priority ?? Infinity) - (b.bead.priority ?? Infinity) || byId(a, b));
   ```
   Two beads without priority give `NaN` from `Infinity - Infinity`, which is falsy, so `byId` decides; test that case.
5. Write `useKeyed.test.tsx` with `renderHook` and deferred promises: 14 keys with limit 4 never has more than 4 open; a rerender with the same keys asks nothing; a new key is asked; a rejection becomes an error answer and frees its slot. Then `useKeyed.ts`:
   ```ts
   import { useEffect, useRef, useState } from "react";

   export type Answer<T> = { status: "ok"; data: T } | { status: "error"; message: string };

   /** Asks `fetcher` once per key, at most `limit` at a time, and keeps every answer. `fetcher` must be stable. */
   export function useKeyed<T>(keys: readonly string[], fetcher: (key: string) => Promise<T>, limit: number): ReadonlyMap<string, Answer<T>> {
     const [answers, setAnswers] = useState<ReadonlyMap<string, Answer<T>>>(new Map());
     const asked = useRef(new Set<string>());
     const queue = useRef<string[]>([]);
     const running = useRef(0);
     const live = useRef(true);
     const joined = JSON.stringify(keys);

     useEffect(() => {
       live.current = true;
       return () => {
         live.current = false;
       };
     }, []);

     useEffect(() => {
       const pump = () => {
         while (live.current && running.current < limit && queue.current.length > 0) {
           const key = queue.current.shift() ?? "";
           running.current += 1;
           const settle = (answer: Answer<T>) => {
             running.current -= 1;
             if (!live.current) return;
             setAnswers((prev) => new Map(prev).set(key, answer));
             pump();
           };
           fetcher(key).then(
             (data) => settle({ status: "ok", data }),
             (error: unknown) => settle({ status: "error", message: error instanceof Error ? error.message : String(error) }),
           );
         }
       };
       const wanted: unknown = JSON.parse(joined);
       for (const key of Array.isArray(wanted) ? wanted.map(String) : []) {
         if (asked.current.has(key)) continue;
         asked.current.add(key);
         queue.current.push(key);
       }
       pump();
     }, [joined, fetcher, limit]);

     return answers;
   }
   ```
6. Run `pnpm -C frontend test --run src/features/overview`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`; expect pass. Commit `feat(overview): overview data and rules (gin-console-rm-overview)`.

### Track 3: Overview page
- **Dependencies**: Track 2
- **Requirements**: REQ-OVERVIEW-005, REQ-OVERVIEW-007, REQ-OVERVIEW-008, REQ-OVERVIEW-009, REQ-OVERVIEW-010, REQ-OVERVIEW-011, REQ-MILESTONE-UI-023
- **Files**:
  - Create `frontend/src/features/overview/OverviewPage.tsx`
  - Create `frontend/src/features/overview/AttentionSection.tsx`
  - Create `frontend/src/features/overview/BeadLink.tsx`
  - Create `frontend/src/features/overview/GateSections.tsx`
  - Create `frontend/src/features/overview/MilestoneLines.tsx`
  - Create `frontend/src/features/overview/WorkloadSection.tsx`
  - Modify `frontend/src/lib/definitions.ts:2-25` (overview tooltips)
  - Test `frontend/src/features/overview/OverviewPage.test.tsx`
- **Interfaces**: consumes Track 2, `useLoad`, `fetchStatus`, `statusVerdict`, `selectedStatusMilestone`, `fetchMilestones`, `milestonePath`, `fetchEpicWorkflow`, `AssigneeName`, `StaleNote`, `Hint`, `StateGlyph`, `usePageTitle`, `useRestoreOnBack`. Produces `OverviewPage()`.
- **Provider role**: `frontend`
- **Model:** `opus`
- **Effort:** `medium`
- **Why:** combines several modules and async states on one page; layout needs judgement, the rules are given.
- **Acceptance criteria**: every scenario of the Requirements that a unit test can check has one naming its REQ; 360px is measured in Track 5.
- **Estimated complexity**: high

Steps:

1. Write `OverviewPage.test.tsx`: render `<OverviewPage />` inside `HintProvider`, with a `fetch` stub answering `/api/overview`, `/api/reports/status`, `/api/milestones`, and `/api/beads/<p>/<e>/workflow` by URL, counting the calls. Start with:
   ```tsx
   it("REQ-OVERVIEW-010 a project error is one alert and the other project's lists are shown", async () => {
     stub({ projects: [{ ...project("a"), error: "issues.jsonl is missing" }, { ...project("b"), blocked: [blocked("t-3")] }] });
     page();
     expect(await screen.findByText("a could not be loaded")).toBeInTheDocument();
     expect(screen.getByRole("link", { name: /t-3/ })).toHaveAttribute("href", "/beads/b/t-3");
   });
   ```
   where `project(name)` is an empty `ProjectOverview`, `blocked(id)` a `BlockedBead` with `days: 4` and no blocker, `stub` installs the fetch mock, and `page` renders. Add one test per scenario of REQ-OVERVIEW-007 to 010, using fake timers for the poll, and the REQ-MILESTONE-UI-023 late word. Run; expect failure.
2. Add to `DEFINITIONS`:
   ```ts
   overviewMilestones: "Milestones: the open milestone of each project, an overdue one first, with its Reports status verdict.",
   overviewAging: "In progress too long: working days since the start, above the configured number. Blocked beads are listed under Blocked; prep tasks and epics split into tracks are left out.",
   overviewGates: "Gates not met: epics in progress before requirement, plan or orchestration is approved, or with a gate that could not be read.",
   overviewWaivers: "Waivers: waived gates and reviews of epics in progress.",
   overviewUnassigned: "Unassigned ready: ready beads with no assignee; prep tasks and epics split into tracks are left out.",
   overviewWorkload: "Work in progress: beads in progress and not blocked, per assignee, in all projects; epics split into tracks are left out.",
   ```
3. Write `BeadLink.tsx`, used by every list:
   ```tsx
   import { Link } from "@/app/Link";

   const enc = encodeURIComponent;

   export function BeadLink({ project, id, title }: { project: string; id: string; title: string }) {
     return (
       <Link to={`/beads/${enc(project)}/${enc(id)}`} className="min-w-0 [overflow-wrap:anywhere] hover:text-identity">
         <span className="font-mono text-13 text-muted-foreground">{id}</span> {title}
       </Link>
     );
   }
   ```
   Write `AttentionSection.tsx`:
   ```tsx
   import { useState, type ReactNode } from "react";
   import { Hint } from "@/components/ui/tooltip";

   const SHOWN = 10;

   /** One list of Needs attention: its count and rule, 10 rows and "Show all" (REQ-OVERVIEW-009). */
   export function AttentionSection({ title, hint, rows, pending = null, footer = null }: { title: string; hint: string; rows: { key: string; id: string; content: ReactNode }[]; pending?: string | null; footer?: ReactNode }) {
     const [all, setAll] = useState(false);
     const shown = all ? rows : rows.slice(0, SHOWN);
     return (
       <section className="flex min-w-0 flex-col gap-2">
         <h3 className="text-sm font-semibold">
           <Hint text={hint}>
             <span tabIndex={0}>{pending === null ? `${title} (${rows.length})` : title}</span>
           </Hint>
         </h3>
         {pending !== null ? (
           <p className="text-sm text-muted-foreground">{pending}</p>
         ) : rows.length === 0 ? (
           <p className="text-sm text-muted-foreground">None</p>
         ) : (
           <ul className="flex flex-col divide-y">
             {shown.map((row) => (
               <li key={row.key} data-id={row.id} tabIndex={-1} className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 py-2 text-sm [overflow-wrap:anywhere]">
                 {row.content}
               </li>
             ))}
           </ul>
         )}
         {pending === null && !all && rows.length > SHOWN && (
           <button type="button" className="min-h-11 self-start text-13 font-medium hover:text-identity" onClick={() => setAll(true)}>
             Show all
           </button>
         )}
         {footer}
       </section>
     );
   }
   ```
4. Write `GateSections.tsx`. Keys are `JSON.stringify([project, id])`:
   ```tsx
   import { fetchEpicWorkflow } from "@/features/beads/api";
   import type { EpicWorkflow } from "@/features/projects/api";
   import { DEFINITIONS } from "@/lib/definitions";
   import type { ProjectOverview } from "./api";
   import { AttentionSection } from "./AttentionSection";
   import { BeadLink } from "./BeadLink";
   import { gateIssues, waiversOf } from "./gates";
   import { useKeyed, type Answer } from "./useKeyed";

   const LIMIT = 4;

   function load(key: string): Promise<EpicWorkflow> {
     const parsed: unknown = JSON.parse(key);
     const [project, id] = Array.isArray(parsed) ? parsed.map(String) : ["", ""];
     return fetchEpicWorkflow(project, id);
   }

   export function useGates(projects: readonly ProjectOverview[]) {
     const epics = projects.flatMap((p) => p.epics.map((epic) => ({ project: p.name, epic, key: JSON.stringify([p.name, epic.id]) })));
     const answers = useKeyed(epics.map((e) => e.key), load, LIMIT);
     const done = epics.filter((e) => answers.has(e.key)).length;
     return { epics, answers, pending: done < epics.length ? `Checking ${done} of ${epics.length}` : null };
   }

   type Gates = ReturnType<typeof useGates>;
   const okOf = (answer: Answer<EpicWorkflow> | undefined) => (answer?.status === "ok" ? answer.data : null);

   export function GatesSection({ gates }: { gates: Gates }) {
     const rows = gates.epics.flatMap(({ project, epic, key }) => {
       const workflow = okOf(gates.answers.get(key));
       const issues = workflow === null ? [] : gateIssues(workflow);
       return issues.length === 0 ? [] : [{ key, id: epic.id, content: <><BeadLink project={project} {...epic} /><span className="text-muted-foreground">{project}</span><span>{issues.join(", ")}</span></> }];
     });
     const failed = gates.epics.flatMap(({ project, epic, key }) => {
       const answer = gates.answers.get(key);
       return answer?.status === "error" ? [{ project, epic, key, message: answer.message }] : [];
     });
     const footer = failed.map((f) => (
       <p key={f.key} className="text-sm text-destructive [overflow-wrap:anywhere]">{`Could not read gates of ${f.epic.id} (${f.project}): ${f.message}`}</p>
     ));
     return <AttentionSection title="Gates not met" hint={DEFINITIONS.overviewGates} rows={rows} pending={gates.pending} footer={footer} />;
   }

   export function WaiversSection({ gates }: { gates: Gates }) {
     const rows = gates.epics.flatMap(({ project, epic, key }) => {
       const workflow = okOf(gates.answers.get(key));
       return (workflow === null ? [] : waiversOf(workflow)).map((waiver, n) => ({
         key: `${key}/${n}`,
         id: epic.id,
         content: <><BeadLink project={project} {...epic} /><span className="text-muted-foreground">{project}</span><span>{waiver.subject}: {waiver.reason}</span></>,
       }));
     });
     return <AttentionSection title="Waivers" hint={DEFINITIONS.overviewWaivers} rows={rows} pending={gates.pending} />;
   }
   ```
   The "Waivers" row links its epic; the subject names the gate or bead.
5. Write `MilestoneLines.tsx`. Status and forecast are separate `useKeyed` calls (limit 4): status keys are `JSON.stringify([project, milestone.id])` with a loader calling `fetchStatus(project, { kind: "milestone", id })`; forecast keys are project names with `fetchMilestones`. Pass forecast keys only for projects whose status answered, so the verdict comes first:
   ```tsx
   const key = (p: ProjectOverview) => (p.milestone === null ? null : JSON.stringify([p.name, p.milestone.id]));
   const withMilestone = projects.filter((p) => p.milestone !== null);
   const status = useKeyed(withMilestone.map((p) => key(p) ?? ""), loadStatus, 4);
   const forecast = useKeyed(withMilestone.filter((p) => status.has(key(p) ?? "")).map((p) => p.name), fetchMilestones, 4);
   ```
   For each project without `error` draw one line: name; the milestone title as `<Link to={milestonePath(project, id)}>` or "No open milestone"; "Loading status…" until the status answers, or its error message; otherwise the `StateGlyph`, word, and sentence of
   `statusVerdict(report, milestone, finish, unsplit)`, with `milestone = selectedStatusMilestone(report)`, `unsplit = report.epics.filter((e) => e.status !== "closed" && e.child_counts.total === 0).length`, and `finish = list.milestones.find((m) => m.id === milestone.id)?.finish ?? null` once the forecast is ok, else `null`. Note "Checking forecast" while it has no answer, "Forecast not loaded" when it failed. When `milestone` is `null` or its id differs from the asked one, show "Status not available". Tones use the `VerdictPanel` colours.
6. Write `WorkloadSection.tsx`: heading with the `overviewWorkload` hint, one `li` per `workloadOf(projects)` row with the person ("Unassigned" for `null`), `total`, `"<n> in <project>"` per project, and a `<details>` listing the beads with `BeadLink`; "None" when empty.
7. Write `OverviewPage.tsx`:
   ```tsx
   export function OverviewPage() {
     usePageTitle("Overview");
     const { state, retry } = useLoad(fetchOverview, true);
     useRestoreOnBack(state.status === "ok");
     useEffect(() => rememberOrigin("overview", "/", "", null), []);
     ...
   }
   ```
   The `rememberOrigin` line is added in Track 4, which makes `overview` a valid kind. Body: `h1` "Overview"; loading text; on `error` a destructive Alert with the message and a Retry button calling `retry`; on `ok` an inner `<Loaded data={state.data} />` so its hooks run only with data, plus an Alert when `state.error` is set. `Loaded` draws "No projects configured." when `projects` is empty; else `StaleNote` for the stale names, one Alert `"<name> could not be loaded"` per `error`, then `MilestoneLines`, an `h2` "Needs attention" with Blocked, `In progress > ${aging_days} days`, `GatesSection`, `WaiversSection`, "Unassigned ready", and `WorkloadSection`. A Blocked row holds `BeadLink`, project, `AssigneeName`, `waits ${days} d`, and, with a blocker, `on` plus a `BeadLink` to it and its person. An aging row holds `BeadLink`, project, `AssigneeName`, `${days} d`. An unassigned row holds `BeadLink`, project, and `P${priority}` when there is one.
8. Run `pnpm -C frontend test --run src/features/overview`, `typecheck`, `lint`; expect pass. Commit `feat(overview): overview page (gin-console-rm-overview)`.

### Track 4: Home page, navigation, and way back
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-099, REQ-UI-123
- **Files**:
  - Delete `frontend/src/app/HomeRedirect.tsx`
  - Modify `frontend/src/app/App.tsx:10` (import)
  - Modify `frontend/src/app/App.tsx:82-83` (the `/` page)
  - Modify `frontend/src/app/Layout.tsx:1-71` (first link, follow the chosen project)
  - Modify `frontend/src/app/ProjectSwitcher.tsx:13-25` (no duplicate entry, follow the choice)
  - Modify `frontend/src/app/origin.ts:4-97` (kind `overview`)
  - Modify `frontend/src/features/beads/Breadcrumb.tsx:33-50` (label)
  - Modify `frontend/src/features/overview/OverviewPage.tsx` (remember the place)
  - Test `frontend/src/app/Layout.test.tsx`
  - Test `frontend/src/app/origin.test.ts`
  - Test `frontend/src/app/App.test.tsx`
  - Test `frontend/src/app/project.test.ts`
  - Test `frontend/src/app/ProjectSwitcher.test.tsx`
  - Test `frontend/src/app/usePageTitle.test.tsx`
  - Test `frontend/src/features/beads/Breadcrumb.test.tsx`
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`
- **Interfaces**: produces `OriginKind` with `"overview"`, and `rememberOrigin(kind, path, search, project: string | null, ...)`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** small edits in shared shell files with many tests that pin the old behaviour.
- **Acceptance criteria**: every scenario of the Requirements has a test; the whole frontend suite passes.
- **Estimated complexity**: medium

Steps:

1. Change the tests to the new REQ text: five links, `["Overview", "/"]` first; the `/` redirect tests of `MyTasksPage.test.tsx:75` and `Layout.test.tsx` become "the URL stays `/`"; add breadcrumb, title, switcher, and `originFor("b", overviewPlace)` tests. Run `pnpm -C frontend test --run src/app src/features/beads/Breadcrumb.test.tsx src/features/my-tasks`; expect failures.
2. `origin.ts`: `KINDS = ["overview", "beads", "milestone", "my-tasks", "reports"]`; `project: string | null` in `rememberOrigin`; update the comment of `Origin.project` (null for the Overview and for nothing remembered); and
   ```ts
   /** The origin when it is the Overview (beads of any project) or a place of the bead's project, else null. */
   export function originFor(beadProject: string, origin: Origin): Origin | null {
     return origin.kind === "overview" || origin.project === beadProject ? origin : null;
   }
   ```
3. `Breadcrumb.tsx` `firstLink`: `case "overview": return { to: origin.path, label: "Overview" };`.
4. `Layout.tsx`: import `House` from `lucide-react` and put first in `NAV`:
   `{ to: () => "/", label: "Overview", icon: House, current: ({ path, from }: Place) => path === "/" || from === "overview" },`. The array mixes signatures; `to(project)` still type-checks because `() => string` accepts the argument.
5. `App.tsx`: import `OverviewPage` and render it for `pathname === "/"`; delete `HomeRedirect.tsx`. Add the `rememberOrigin` effect to `OverviewPage.tsx` with a braced body so that it returns nothing.
6. `switchProject("/", "", "b")` already returns `/`; pin it in `project.test.ts`. In `ProjectSwitcher.tsx` `choose`, so that no duplicate history entry is added:
   ```ts
   const target = switchProject(pathname, search, name);
   if (target !== pathname + search) navigate(target);
   ```
   In `Layout.tsx`, call `useTabProject()` (import it from `./project`) before `resolveProject`, and the same in `ProjectSwitcher.tsx`, so that the links and the named project follow a choice that leaves the address as it is. Test both and the unchanged `history.length`.
7. Run `pnpm -C frontend test --run`, `typecheck`, `lint`, `build`; expect pass. Commit `feat(ui): Overview as the home page (gin-console-rm-overview)`.

### Track 5: QA cases, e2e, and TC-1
- **Dependencies**: Track 1, Track 4
- **Requirements**: REQ-OVERVIEW-001, REQ-OVERVIEW-009, REQ-OVERVIEW-010, REQ-OVERVIEW-011, REQ-UI-055, REQ-UI-099
- **Files**:
  - Create `qa/cases/overview/` (one case per REQ-OVERVIEW scenario that e2e can show)
  - Create `qa/e2e/overview/` (one spec per case)
  - Modify `qa/cases/ui/TC-UI-139-open-my-tasks.e2e.md`
  - Modify `qa/cases/ui/TC-UI-140-home-address.e2e.md`
  - Modify `qa/cases/ui/TC-UI-151-home-address-without-projects.e2e.md`
  - Modify `qa/cases/ui/TC-UI-249-four-links.e2e.md`
  - Modify `qa/e2e/ui/tc-ui-139.spec.ts`
  - Modify `qa/e2e/ui/tc-ui-140.spec.ts`
  - Modify `qa/e2e/ui/tc-ui-151.spec.ts`
  - Modify `qa/e2e/ui/tc-ui-249.spec.ts`
  - Modify `qa/e2e/support/api.ts` (stub of `/api/overview`)
  - Modify `docs/changes/gin-console-rm-overview-overview/05-tests.md` (TC-1 evidence)
- **Interfaces**: consumes the shipped page and endpoint.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** follows the existing gin-qa case and spec style; no product code.
- **Acceptance criteria**: `gin-qa` checks of the new and changed cases pass, the specs pass, and TC-1 is recorded with its result.
- **Estimated complexity**: medium

Steps:

1. Read the `gin-console-qa` skill and write or update the cases with `gin-qa:cases`; refresh the REQ hashes the cases cite.
2. Write the specs with `gin-qa:e2e`, stubbing `/api/overview` with several projects, one of them with an `error`; one spec at 360px checks `scrollWidth <= clientWidth` with a 60-character project name. Build the frontend first (`pnpm -C frontend build`) and run the specs with `--trace off`; expect pass.
3. Run `gin specs trace --change gin-console-rm-overview`; expect no missing REQ.
4. TC-1 runs on the Tailscale build: open `/` at 1440px and 360px with the real projects, check the verdicts, gates, workload, and the return from a bead of another project, and record the result in `05-tests.md`. Restart of the deployed service needs the user's go-ahead.
5. Commit `test(overview): QA cases and e2e specs (gin-console-rm-overview)`.

## Integration
- **Branch**: `feat/rm-overview`
- **Merge strategy**: parallel-then-merge

## Validation
- [ ] `uv run --directory backend pytest && uv run --directory backend ruff check . && uv run --directory backend mypy`
- [ ] `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`
- [ ] `gin specs lint --change gin-console-rm-overview --against master` and `gin specs trace --change gin-console-rm-overview`
- [ ] TC-1 on the Tailscale build

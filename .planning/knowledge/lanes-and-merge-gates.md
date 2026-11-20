# Lanes view and merge gates from gin-workflow team mode

**Context**
Epic gin-console-9ix (2026-11-20) shows gin-workflow's team-mode lanes (gin-workflow-ifbt): a lane is one member's tracks of an epic in one repository, on one branch and one pull request. No configured project runs team mode yet, so the feature was built and checked on the example project's epic `ex-e12`. The console reads only the Beads export: no `gin team` output, no pull request state.

**Decision/Solution**
- **Fields** (`backend/src/gin_console/beads/lanes.py`, regexes copied from gin-workflow `team_pending.py`/`team_beads.py`):
  - `lane`: the `Lane:` description line, else the `lane:` label; must match `^[a-z0-9][a-z0-9-]*$`.
  - `track`: `{plan, number}` from `Plan: <path>, Track <N>`, else the `track:<N>` label.
  - `claim`: `{holder, expires_at}` from `metadata.claim`, given as an object or a JSON string, with the stamp `YYYY-MM-DDTHH:MM:SSZ`.
  - `waits_for`: `{plan, number, track_id, lane}` from a title `external: <path>#<N>`.
- **Merge gates:** "merge gate" is the console's name for gin-workflow's placeholder bead; only its title is fixed upstream.
  - **Resolution (server):** `gate_ref` looks among the children of the gate's parent, or, for a gate without a parent, of the parent of the first bead it blocks. It takes the single exact plan and number match, else the only child with that number, else null. The server does this because the bead page has no bead list.
  - **Relations:** dependencies and dependents use `GateRelation`, and `ChildRelation` carries `waits_for`. Bugs keep the plain `Relation`, because `test_beads_002_bugs_over_http` compares relation dicts exactly.
- **A merge gate is not work:**
  - **Backend:** it is never `ready` but still blocks; it is left out of the project counts (`projects/source.py`) and of report selection and the team scope (`reports/source.py` `read_beads`).
  - **Frontend:** `withoutMergeGates` drops it from List, Board, Focus, My Tasks, Gantt child rows and every child count.
  - **Where it still shows:** the Graph (a dashed `GitMerge` node), the Lanes markers, its bead page and the Dependencies words.
  - **Graph wiring:** the Graph's `matched` must be built from the milestone-free list that still holds the gates (`BeadsView.tsx` `withGates`). Bug gin-console-9ix.9 hid every gate node, and a GraphView unit test that passed in a hand-made `matched` set hid it.
- **Lanes layout** (`frontend/src/features/beads/lanes.ts`, pure and unit-tested):
  - `LANE = {cardW 184, cardH 64, rowH 144, gapX 48, gapY 32, padX 16, padY 32}`.
  - Columns are a longest path over blockers, gate targets and the previous card in each row.
  - Arrows are orthogonal and run only through column and row gaps.
  - Markers (Waiting/Merged) sit on the gate arrow's row-gap segment; the opaque chips may cover another arrow's straight segment.
  - The lane state is the first of All tracks closed, Running, Waiting for <lanes>, Blocked, Not started, Idle. The tab is decided from the loaded children.
- **Canvas** (`LanesCanvas.tsx`):
  - It is a fixed-height scroll box like `GraphCanvas`, with a sticky header column that is 168px under 1024px and 240px from 1024px.
  - It needs `isolate`; see [readable-ui](readable-ui.md).
- **Example data:** `ex-e12` is added last in `build()` and swaps `p.rng` for its own `random.Random(12)`, because `long_text` draws from `p.rng` through `p.task` and would shift otherwise.

**Consequences**
- **Pull request state is not shown.** "Delivered" would need host data, so it is a possible cross-repo epic in gin-harness. A closed gate (with `metadata.merge_commit`) is the only merge trace in Beads.
- **A lane whose tracks are all closed gets no Lanes tab** until closed beads are loaded ("Show closed", a sprint, a closed milestone, or opening `view=lanes`).
- **The last column can be hidden.** At 1440px with the details panel open, the last column sits behind the horizontal scroll, as in the Graph.
- **e2e:**
  - `stubApi` does not stub `/api/beads/<project>/<id>`, so `qa/e2e/support/lanes.ts` adds `stubDetails`, registered after `stubApi` because the later route wins.
  - Find the lanes SVG with `svg:has(polyline)`, because the headers hold lucide icons.
  - The search box has `role=searchbox`.
  - Focus "Next up" needs `ready` and a priority of at most 1.
  - A Board card needs `ready` to appear in the default columns.
  - The Gantt expand button reads "Show 1 child bead of <id>" in the singular.
- **gin-qa:**
  - `gin-qa cases new` takes the lowest free id, so do not probe with it.
  - `gin-qa tests run --type api <capability>` records every api case of that capability; pass TC ids.
  - Case steps need explicit URLs and one action each.

**References**
- **Code:**
  - Backend: `backend/src/gin_console/beads/{lanes.py,models.py,source.py}`.
  - Frontend: `frontend/src/features/beads/{lanes.ts,LanesView.tsx,LanesCanvas.tsx,scope.ts,ScopeTrail.tsx,mergeGates.ts,laneFacts.ts,LaneChip.tsx,BeadsView.tsx}`.
  - Tests and data: `qa/e2e/support/lanes.ts` and `scripts/make_example_project.py`.
- **Specs:** REQ-BEADS-019 and REQ-UI-111 to REQ-UI-116. The change is in `docs/changes/archive/2026-11-20-gin-console-9ix-lanes-view/`.
- **Upstream:** gin-workflow `plugins/gin-workflow/src/skills/team/references/lanes.md`.
- **Beads:** gin-console-9ix (tracks .1–.8, bugs .9–.11) and gin-workflow-ifbt. Related records: [readable-ui](readable-ui.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md).

**Scope**
Any change to lanes, merge gates, team-mode data in Beads, or the Beads views' data wiring.

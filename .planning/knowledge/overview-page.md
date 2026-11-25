# Overview page at `/`

**Context**
Epic gin-console-rm-overview (2026-11-25) made `/` a cross-project page for leads. Its lists come from `GET /api/overview`; verdicts, forecasts, gates and waivers come from endpoints that existed.

**Decision/Solution**
- **Backend:** `gin_console/overview/` builds each project from its snapshot with the Reports rules `blocker_of`, `wait` and `tracked`, and starts no process. A project's failure stays with it: `router.one` also catches `OverflowError`, because `day_of` raises it for an out-of-range bead date outside UTC.
- **Gates:** gin has no failing gate. The page lists in-progress epics with an entry gate unmet or any gate unknown (`overview/gates.ts`). Waivers never close in gin, so every waiver of an in-progress epic is shown.
- **Request limit:** Refresh remounts the page, so a per-mount limit does not bound open requests. `useKeyed` takes slots from `createSlots`, and `GATE_SLOTS` is held at module level (peak 8 before, 4 after).
- **Keys:** a `useKeyed` key must hold every identity that should ask again. The forecast is keyed by project and milestone.
- **Status answer:** `fetchStatus` checks only the outline, so a page that renders `statusVerdict` outside Reports needs a guard (`overview/statusGuard.ts`). Dates must be plain `YYYY-MM-DD`; a date with a time throws in the verdict.
- **Origin:** the kind `overview` has no project and fits a bead of any project (`originFor`).
- **Switcher at `/`:** the address does not change, so `Layout` and `ProjectSwitcher` subscribe with `useTabProject`; a `?project=` in the address is replaced.

**Consequences**
- **Back:** the place is restored when the lists show. A Gates or Waivers row, a row past the first 10 and a bead id in several lists may not get the focus (`simplified:` comment in `OverviewPage.tsx`). REQ-UI-127 does not name the Overview.
- **Not mapped:** TC-OVERVIEW-001 to 014 and TC-CONFIG-004 to 006 have backend tests but no `gin-qa tests` mapping.
- **Config:** deploy the code before adding `overview` to the config; an older install refuses the key.
- **E2E from a worktree:** port 8701 may serve another checkout. Use a Playwright config outside the repo with a free port. TC-UI-301 passes only on 8701.
- **Flaky under load:** `App.test.tsx` (REQ-UI-088/095) and `ReportsPage.test.tsx` (REQ-UI-095 fade) failed in 2 of 4 full runs on a busy machine and passed later on the same code. The cause was not proven.

**References**
- Change: `docs/changes/archive/2026-11-25-gin-console-rm-overview-overview/` (TC-1 result in `05-tests.md`).
- Beads: gin-console-rm-overview, tracks .1 to .5.
- Related: [retired-projects-page](retired-projects-page.md), [navigation-shell](navigation-shell.md).

**Scope**
The home page, the overview endpoint, bounded gin requests from the frontend, and the remembered place.

# Test coverage and release readiness

**Context**
Epic `gin-console-rm-test-coverage` (2026-11-27) adds a Tests page (cases by capability, type and effective result; failed cases with their bug), a case page with the latest e2e run and its step screenshots, and a Readiness tab on the milestone page. The trace of the requirements epic carries only `id` and `effective_result` per case, so the console now also runs `gin-qa cases export --format json` (935 cases, about 1 MB, about 0.6 s in gin-console). gin-qa works out `outdated` from the case stamp and the pinned requirement hashes; the console never works a result out again (ADR 0007).

**Decision/Solution**
- New context `backend/src/gin_console/qa/`: `source.py` (injected `run_gin_qa`, 30 s, causes `missing` and `outdated`), `models.py` (`Cause`, `RunReason` live here to avoid an import cycle), `runs.py` (latest run from the case's `run`), `service.py` (`find_case`, list and detail), `readiness.py` (pure rules of REQ-QA-007/008), `router.py` (caches: export per project, trace per project, milestone detail per (project, milestone), gates per (project, epic), all 60 s and cleared on refresh).
- Latest run: `run` must be a relative path without `..`, `\`, NUL or `:` that resolves inside the project; `<run>/<id lower>/result.json` is read up to 1 MB; a screenshot name is a plain file name served through the `images.py` checks (`read_image` is public). Reasons `no_run`, `not_on_host`, `invalid`.
- Readiness: requirements of a milestone are those the trace links to one of its epics through an `added` or `modified` change (archived or not), not removed; items `cases`, `results` (only `passed` passes), `bugs` (open P0/P1 of the milestone's epics or of no source epic), `gates` (all five gates `satisfied` or `waived(...)`). No requirement in scope passes the case items with "No requirement changed", even when gin-qa fails. An unknown milestone is detected from the Beads snapshot (404); `gin milestone show` failing is 502.
- `gin state --workflow-id` calls queue on a dev host (1.3–3.3 s alone; the fourth of four at once passed 10 s), so `collect_epic_workflow` takes a `timeout`: the readiness gates use 30 s on one shared pool of four, the bead workflow route keeps 10 s. `create_app(run_epic_workflow=None)` wires each router's real runner; an injected fake goes to both.
- Every route that takes a project is listed in `PROJECT_ROUTES` of `backend/tests/test_auth_access_api.py` with a fake for each runner it needs; a sample needing a milestone gets it in project `b` only.
- Frontend: `features/qa/` (Tests page, case page, `useFetched`, guards that check only used fields), `features/milestones/ReadinessTab.tsx`; `Lightbox` takes `slides: {key, src, caption}[]` so bead images and run screenshots share it; Layout takes the current project only from `?project=`, the favorite and the tab memory, so the case page remembers its project through `ProjectGuard`.

**Consequences**
- The Tests page and the Readiness tab need gin-qa on the console host; the Docker image has none.
- Screenshots show only on a host that has `qa/evidence` (git-ignored, about 700 MB here).
- A cold Readiness tab of a four-epic milestone takes about 20 s on this host, then answers from the caches.
- Known follow-ups (review of `.1`, minor): the `simplified:` race comment in `qa/runs.py` names the wrong race (reuse the `/proc/self/fd` check), no cap on steps (steps ≥ 1000 get no screenshot route), Windows Git Bash without gin-qa gives cause `null`, `get_case` has no `response_model`. Specs tc-ui-232 and tc-ui-236 fail on master since project-timeline (bug gin-console-9ta).

**References**
- `docs/changes/archive/2026-11-27-gin-console-rm-test-coverage-test-coverage/`, `docs/adr/0007-console-reads-qa-results.md`
- `backend/src/gin_console/qa/`, `backend/src/gin_console/projects/collect.py` (`timeout`), `frontend/src/features/qa/`, `frontend/src/features/milestones/ReadinessTab.tsx`, `qa/e2e/support/qa.ts`
- Beads: `gin-console-rm-test-coverage` (`.1` to `.5`), `gin-console-9ta`; related [requirements-page](requirements-page.md), [shared-attachments](shared-attachments.md)

**Scope**
Anything that reads gin-qa output or e2e run folders, the Readiness checklist, and fan-out calls of `gin state`.

# Plan: Retire Sessions and Quota

Epic: gin-console-rm-retire-sessions-quota
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder.

## Objective
The console no longer has the Sessions and Quota features:
- **Code:** no backend context, route, page, test or Windows process code is left for them.
- **Shared helpers:** the four helpers other features use live in shared places: `clean`, `utc_now`, `formatAge`/`formatTimes` and `ProgressBar`.
- **Docker:** the image does not install `claude` or `codex`, and compose does not mount `~/.claude` or `~/.codex`.
- **Docs:** README, AGENTS.md, the deploy docs and the specs index say the same.

Done when:
- Every scenario of the MODIFIED REQ-BEADS-018, REQ-UI-057, REQ-DOCKER-001, REQ-DOCKER-003, REQ-DOCKER-004 and REQ-DOCKER-006 has a test or a case that names its REQ.
- `gin-qa cases check --change gin-console-rm-retire-sessions-quota` prints `ok`.
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
  - Sessions and Quota have no entry in the navigation, and the PM retired them on 2026-11-21.
  - Their code, tests, Docker tools and docs are still maintained.
  - Four helpers that other features use live inside `quota`.
- **Success criteria:**
  - Everything in the Objective.
  - The checks pass: `uv run --directory backend pytest`, `ruff check .` and `mypy`; `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`.
  - `gin specs lint --change gin-console-rm-retire-sessions-quota --against master` prints `ok`, and `gin specs trace --change gin-console-rm-retire-sessions-quota` lists no missing REQ.
  - The source sweep finds no reference left (Track 7).
- **Global constraints** (from the spec and the user's decisions):
  - Approach A: remove the features completely, including the Docker CLIs and mounts.
  - `Settings` keeps `extra="forbid"`. No config key changes, because none existed.
  - `.dockerignore` keeps `.claude` and `.codex`, which keep a checkout's local agent settings out of the build context.
  - ADR 0001 keeps its text.
  - Old addresses `/sessions`, `/sessions/<project>/<id>` and `/quota` render the `App.tsx` fallback (the Projects page) and mark no nav link.
  - Every other endpoint and page keeps its contract.
  - Linux, macOS and native Windows keep working; `projects/collect.py` and its win32 branch are untouched.
- **Non-goals:**
  - A replacement for session logs or quota.
  - The not-found page (epic gin-console-rm-nav-shell).
  - Changing the Docker runtime base image.

## Approach Options
### Option 1: Delete in four steps, helpers first
- **Summary:**
  - Move the shared helpers out of `quota` first, then delete the backend, then the frontend.
  - Docker, deploy and docs go in their own track; cases and the deployed check follow.
- **Pros:**
  - Every track leaves a green build and can be reviewed or reverted alone.
  - Reviewers see the moves apart from the deletions.
- **Cons:** seven tracks for a small change.

### Option 2: One deletion track
- **Summary:** move, delete and document in a single track.
- **Pros:** fewer handoffs.
- **Cons:**
  - One large diff mixes moves with deletions.
  - A failing check is harder to pin down, and a review rejection throws away everything.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the moves are the only risky part. Isolating them makes a broken import visible in the smallest diff, and the deletions after them are mechanical.

## Scope
- **In scope:** the four tracks of `03-design.md`, the gin-qa cases and tests of the changed REQs, and the deployed check (TC-1).
- **Out of scope:** the non-goals above; the living specs folders, which `specs archive` handles at ship.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: One lane (roadmap AI capacity 1); each track is small and the deletions depend on the moves.
```

## Tasks
### Track 1: Shared backend helpers
- **Dependencies**: none
- **Requirements**: REQ-BEADS-018 (bead text cleaning keeps working; no behaviour change)
- **Files**:
  - Create `backend/src/gin_console/text.py`
  - Create `backend/src/gin_console/clock.py`
  - Modify `backend/src/gin_console/beads/models.py:6` (import `clean` from `gin_console.text`)
  - Modify `backend/src/gin_console/app.py:27` (import `utc_now` from `gin_console.clock`)
  - Modify `backend/src/gin_console/quota/source.py:46-48` (drop the `clean` definition, import it from `gin_console.text`)
  - Modify `backend/src/gin_console/quota/service.py:6,12-13` (import `clean` from `gin_console.text`, drop `utc_now`)
  - Modify `backend/tests/test_quota_source.py:15-22,174-177` (drop the moved `clean` test and `clean` from its import)
  - Test `backend/tests/test_text.py`
- **Provider role**: `backend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** moving two one-line functions and their imports, with a test that already exists.
- **Acceptance criteria**:
  - `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
  - `grep -rn "quota" backend/src/gin_console/beads backend/src/gin_console/app.py` shows only the quota router lines that Track 3 deletes.
- **Estimated complexity**: low

Interfaces produced:
- `gin_console.text.clean(text: str) -> str`
- `gin_console.clock.utc_now() -> datetime`

Steps:
1. Write the test `backend/tests/test_text.py`:
   ```python
   from gin_console.text import clean


   def test_clean_replaces_lone_surrogates() -> None:
       assert clean("a\ud800b") == "a?b"
       assert clean("ok 😀") == "ok 😀"
   ```
   Run `uv run --directory backend pytest tests/test_text.py`. Expected: it fails with `ModuleNotFoundError: No module named 'gin_console.text'`.
2. Create `backend/src/gin_console/text.py`:
   ```python
   """Text cleaning shared by every model that returns outside text."""


   def clean(text: str) -> str:
       """Replace lone surrogates: valid in JSON, but a response cannot encode them as UTF-8."""
       return text.encode("utf-8", "replace").decode("utf-8")
   ```
   Create `backend/src/gin_console/clock.py`:
   ```python
   """The console's default clock."""

   from datetime import UTC, datetime


   def utc_now() -> datetime:
       return datetime.now(UTC)
   ```
   Run the test again. Expected: 1 passed.
3. Point the users at the new modules:
   - `beads/models.py:6`: `from gin_console.text import clean`.
   - `app.py:27`: `from gin_console.clock import utc_now`.
   - `quota/source.py`: delete the `clean` definition at lines 46-48 and add `from gin_console.text import clean` to its imports.
   - `quota/service.py`: line 6 becomes `from gin_console.quota.source import SourceError` plus `from gin_console.text import clean` (mypy strict forbids implicit re-exports), and lines 12-13 (`utc_now`) are deleted. Drop any import ruff reports unused.
   - `tests/test_quota_source.py`: drop `clean` from the import at lines 15-22 and delete `test_quota_007_clean_replaces_lone_surrogates` at lines 174-177.
4. Run `uv run --directory backend pytest`, then `uv run --directory backend ruff check .`, then `uv run --directory backend mypy`. Expected: all pass.
5. Commit: `git commit -m "refactor(backend): move clean and utc_now out of quota (gin-console-rm-retire-sessions-quota)"`

### Track 2: Shared frontend helpers
- **Dependencies**: none
- **Requirements**: REQ-BEADS-018
- **Files**:
  - Create `frontend/src/lib/format.ts` (`formatAge`, `formatTimes`, moved from `frontend/src/features/quota/format.ts:9-25`)
  - Test `frontend/src/lib/format.test.ts` (the `formatAge` and `formatTimes` cases of `frontend/src/features/quota/format.test.ts:17-32`, named for REQ-BEADS-018)
  - Create `frontend/src/components/ProgressBar.tsx` (`git mv` from `frontend/src/features/quota/ProgressBar.tsx`, unchanged)
  - Modify `frontend/src/features/quota/format.ts` (keeps only `formatWindow`)
  - Modify `frontend/src/features/quota/format.test.ts` (keeps only the `formatWindow` case)
  - Modify `frontend/src/features/projects/PullLine.tsx:1` (import from `@/lib/format`)
  - Modify `frontend/src/features/beads/BeadBody.tsx:1` (import from `@/components/ProgressBar`)
  - Modify `frontend/src/features/quota/ClaudeCard.tsx:4-5` and `frontend/src/features/quota/CodexCard.tsx:3-4` (import from the new places until Track 4 deletes them)
- **Provider role**: `frontend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** moving two functions and one component with their tests, then fixing imports.
- **Acceptance criteria**:
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `grep -rn "features/quota" frontend/src --include='*.ts*'` lists only files inside `frontend/src/features/quota/` and `frontend/src/app/`.
- **Estimated complexity**: low

Interfaces produced:
- `formatAge(fromIso: string, nowMs: number): string` and `formatTimes(iso: string): string` in `@/lib/format`
- `ProgressBar({ label, percent }: { label: string; percent: number })` in `@/components/ProgressBar`

Steps:
1. Create `frontend/src/lib/format.test.ts`:
   ```ts
   import { describe, expect, it } from "vitest";
   import { formatAge, formatTimes } from "./format";

   const NOW = Date.parse("2026-10-15T03:00:00Z");

   describe("format", () => {
     it("REQ-BEADS-018 writes an age as a relative time", () => {
       const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();
       expect(formatAge(ago(10), NOW)).toBe("just now");
       expect(formatAge(ago(180), NOW)).toBe("3 minutes ago");
       expect(formatAge(ago(7200), NOW)).toBe("2 hours ago");
       expect(formatAge(ago(3 * 86400), NOW)).toBe("3 days ago");
       expect(formatAge(ago(-500), NOW)).toBe("just now");
       expect(formatAge("garbage", NOW)).toBe("just now");
     });

     it("REQ-BEADS-018 writes the full time in local time and in UTC", () => {
       expect(formatTimes("2026-10-15T08:00:00Z")).toContain("2026-10-15 08:00 UTC");
       expect(formatTimes("nonsense")).toBe("nonsense");
     });
   });
   ```
   Run `pnpm -C frontend test --run src/lib/format.test.ts`. Expected: it fails because `./format` does not exist.
2. Create `frontend/src/lib/format.ts`. Move the `relative` constant, `formatAge` and `formatTimes` out of `features/quota/format.ts` unchanged, so that file keeps only `formatWindow`. Delete the two moved cases from `features/quota/format.test.ts` and keep its `formatWindow` case. Run the test again. Expected: 2 passed.
3. Move the component: `git mv frontend/src/features/quota/ProgressBar.tsx frontend/src/components/ProgressBar.tsx`.
4. Fix the imports:
   - `PullLine.tsx:1`: `import { formatAge, formatTimes } from "@/lib/format";`
   - `BeadBody.tsx:1`: `import { ProgressBar } from "@/components/ProgressBar";`
   - `ClaudeCard.tsx`: import `formatAge` and `formatTimes` from `@/lib/format`, and `ProgressBar` from `@/components/ProgressBar`.
   - `CodexCard.tsx`: the same, and keep `formatWindow` from `./format`.
5. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`. Expected: all pass.
6. Commit: `git commit -m "refactor(frontend): move formatAge, formatTimes and ProgressBar out of quota (gin-console-rm-retire-sessions-quota)"`

### Track 3: Delete the backend contexts
- **Dependencies**: Track 1
- **Requirements**: REQ-SESSIONS-001..009 and REQ-QUOTA-001..008 (REMOVED)
- **Files**:
  - Delete `backend/src/gin_console/quota/` (`__init__.py`, `models.py`, `router.py`, `service.py`, `source.py`)
  - Delete `backend/src/gin_console/sessions/` (`__init__.py`, `models.py`, `router.py`, `source.py`)
  - Modify `backend/src/gin_console/app.py:26-30,35,41-43,93-94` (drop the imports, `DEFAULT_CLAUDE_HOME`, the `claude_home`, `run_claude` and `run_codex` parameters, and the two `include_router` lines)
  - Delete `backend/tests/test_quota_api.py`, `backend/tests/test_quota_service.py`, `backend/tests/test_quota_source.py`, `backend/tests/test_sessions_list.py`, `backend/tests/test_sessions_messages.py`, `backend/tests/claude_home.py`
  - Modify the `claude_home=tmp_path` argument out of: `backend/tests/test_beads_api.py:49,236`, `backend/tests/test_beads_prep.py:51`, `backend/tests/test_beads_transfer.py:38`, `backend/tests/test_beads_workflow_api.py:51`, `backend/tests/test_milestones_api.py:50`, `backend/tests/test_project_beads.py:17`, `backend/tests/test_beads_lanes_api.py:32`, `backend/tests/test_beads_milestones.py:31`, `backend/tests/test_pull.py:314`, `backend/tests/test_reports_api.py:35`, `backend/tests/test_reports_team_api.py:37`
  - Test `backend/tests/test_app.py` (one test that the retired endpoints answer 404, built with `make_client` at lines 45-56)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical deletions, but across 20 files with mypy strict, so the middle model keeps the imports and test calls consistent.
- **Acceptance criteria**:
  - The three backend checks pass.
  - `grep -rnE "quota|sessions|claude|codex|taskkill|OpenProcess" backend/src` prints nothing.
  - `grep -rn "claude_home" backend` prints nothing.
- **Estimated complexity**: low

Interfaces changed:
- `create_app(settings, static_dir, read_beads, run_gw, clock, run_bd, schedule_pulls, run_epic_workflow)` loses `claude_home`, `run_claude` and `run_codex`.

Steps:
1. Add to `backend/tests/test_app.py`, with its `make_client` helper:
   ```python
   # REQ-SESSIONS-001 REQ-QUOTA-001 (removed): the retired endpoints fall into the /api 404 route
   def test_retired_endpoints_answer_404(tmp_path: Path) -> None:
       client = make_client(tmp_path, [])
       for path in ("/api/sessions", "/api/sessions/alpha/s-1/messages", "/api/quota"):
           assert client.get(path).status_code == 404
   ```
   Run `uv run --directory backend pytest tests/test_app.py -k retired`. Expected: it fails, because the endpoints still answer.
2. Delete the two packages and the six test files listed above (`git rm -r`).
3. Edit `app.py`:
   - Remove the imports at lines 26 and 28-30 (`build_quota_router`, `run_claude_usage`, `run_codex_rate_limits`, `build_sessions_router`), and `DEFAULT_CLAUDE_HOME` at line 35.
   - Remove the parameters at lines 41-43 and the `include_router` lines at 93-94.
   - Drop any import ruff then reports unused, such as `Any` or `Callable`.
4. Remove `claude_home=tmp_path,` (or `, claude_home=tmp_path`) from the 12 calls listed above.
5. Run the three backend checks. Expected: the new test passes and nothing else fails.
6. Commit: `git commit -m "feat(backend): retire the sessions and quota contexts (gin-console-rm-retire-sessions-quota)"`

### Track 4: Delete the frontend features
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-008..021 (REMOVED), REQ-UI-057
- **Files**:
  - Delete `frontend/src/features/sessions/` (`api.ts`, `SessionsPage.tsx`, `SessionsPage.test.tsx`, `SessionLogPage.tsx`, `SessionLogPage.test.tsx`, `BlockView.tsx`, `MessageView.tsx`, `CopyResumeButton.tsx`)
  - Delete `frontend/src/features/quota/` (the 11 files left after Track 2: `api.ts`, `useQuota.ts`, `QuotaPage.tsx`, `QuotaPage.test.tsx`, `ClaudeCard.tsx`, `CodexCard.tsx`, `quotaStore.ts`, `quotaStore.test.tsx`, `quotaFixtures.ts`, `status.ts`, `status.test.ts`, plus `format.ts` and `format.test.ts` that now hold only `formatWindow`)
  - Modify `frontend/src/app/App.tsx:9-11,19-27,62,72-73,80-81,88-89` (drop the imports, `logRoute` and its `log` constant, the session log branch and the `/sessions` and `/quota` branches)
  - Modify `frontend/src/app/App.test.tsx:4-5,17,103-166` (drop the quota imports, `resetQuotaStore()`, and the REQ-UI-008, REQ-UI-012 and REQ-UI-015 tests; add one REQ-UI-057 test)
  - Modify `frontend/src/features/projects/ProjectsPage.test.tsx:57-64` (drop the REQ-UI-016 test)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical deletions and one routing edit, plus one new test.
- **Acceptance criteria**:
  - The four frontend checks pass.
  - `grep -rnE "features/(sessions|quota)|SessionLog|QuotaPage|/api/quota|/api/sessions" frontend/src` prints nothing.
  - `frontend/src/app/Layout.test.tsx` is unchanged and passes. Its `/sessions` and `/quota` cases check REQ-UI-057 "Address of a retired page".
- **Estimated complexity**: low

Steps:
1. In `App.test.tsx`, replace the four tests at lines 103-166 with one test, using the same fetch stub as the REQ-UI-022 test below them:
   ```ts
   // REQ-UI-057
   it("REQ-UI-057 shows the Projects page for the address of a retired page", async () => {
     vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
     for (const path of ["/sessions", "/sessions/alpha/s-1", "/quota"]) {
       window.history.replaceState(null, "", path);
       render(<App />);
       await screen.findByRole("heading", { name: "Projects" });
       const main = screen.getByRole("navigation", { name: "Main" });
       expect(within(main).queryAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")).toEqual([]);
       cleanup();
     }
   });
   ```
   Delete the quota imports at lines 4-5 and `resetQuotaStore();` at line 17. Run `pnpm -C frontend test --run src/app/App.test.tsx`. Expected: the new test fails on `/sessions` (the Sessions page renders, not Projects).
2. Edit `App.tsx`: remove the imports of `QuotaPage`, `SessionLogPage` and `SessionsPage` at lines 9-11, the `logRoute` function at lines 19-27, the `log` constant at line 62, and the three branches at lines 72-73, 80-81 and 88-89, so the chain starts at `graph !== null`. Run the test again. Expected: it passes.
3. Delete `frontend/src/features/sessions/` and `frontend/src/features/quota/` (`git rm -r`). Delete the REQ-UI-016 test at `ProjectsPage.test.tsx:57-64`.
4. Run `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`. Expected: all pass.
5. Commit: `git commit -m "feat(frontend): retire the Sessions and Quota pages (gin-console-rm-retire-sessions-quota)"`

### Track 5: Docker, deploy and docs
- **Dependencies**: none
- **Requirements**: REQ-DOCKER-001, REQ-DOCKER-003, REQ-DOCKER-004, REQ-DOCKER-006
- **Files**:
  - Modify `Dockerfile:23-24,36` (drop `CLAUDE_VERSION`, `CODEX_VERSION` and the `npm install -g` line)
  - Modify `docker-compose.yml:20-21` (drop the `~/.claude` and `~/.codex` mounts)
  - Modify `scripts/docker-smoke.sh:8-19` (tools without `claude`/`codex`; check both CLIs and both directories are absent)
  - Modify `deploy/gin-console.service:9-10` (the comment names `bd` and `gin` only)
  - Modify `deploy/README.md:20-27,66-68` (PATH note, tool list, mounts, build args)
  - Modify `README.md:3,12-13,28-29,118` (product line, the Quota and Session Inspector features, the two CLI install lines, the Windows process note)
  - Modify `AGENTS.md:3,27-30` (product line, the contexts, the sources, the Windows note)
  - Modify `docs/specs/README.md:12-13` (drop the `sessions` and `quota` links)
- **Provider role**: `docs`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** removing lines from config and prose that name the retired features.
- **Acceptance criteria**:
  - `grep -nE "claude|codex|[Qq]uota|[Ss]ession [Ii]nspector|taskkill|OpenProcess" Dockerfile docker-compose.yml scripts/docker-smoke.sh deploy/gin-console.service deploy/README.md README.md AGENTS.md docs/specs/README.md` prints nothing, except the Windows PowerShell "for this session" lines of `README.md`.
  - `sh -n scripts/docker-smoke.sh` passes.
  - When `docker` is available on the build host, `docker compose build && docker compose up -d && sh scripts/docker-smoke.sh` prints `docker smoke: ok`; otherwise the track notes say Docker was not available.
- **Estimated complexity**: low

Steps:
1. `scripts/docker-smoke.sh` lines 8-19 become:
   ```sh
   # REQ-DOCKER-001 (TC-1)
   exec_in 'uv --version && git --version && bd --version && gin --version' >/dev/null \
     || fail "a required tool is missing"
   if exec_in 'command -v claude || command -v codex' >/dev/null; then fail "an agent CLI is installed"; fi

   # REQ-DOCKER-002 (TC-2)
   [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health)" = 200 ] || fail "/api/health is not 200"
   [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/)" = 200 ] || fail "/ is not 200"

   # REQ-DOCKER-003 / REQ-DOCKER-004 (TC-3, TC-4)
   if exec_in 'test -e "$HOME/.claude" || test -e "$HOME/.codex"'; then fail "a login directory is mounted"; fi
   ```
   The `project=` and `bd list` lines after them stay. Run `sh -n scripts/docker-smoke.sh`. Expected: no output.
2. Edit the Dockerfile, compose, unit and deploy README lines listed above. In `deploy/README.md` the tool list reads `uv`, `git`, `bd` and `gin`, and the build args `BD_VERSION` and `GIN_WORKFLOW_REF`.
3. Edit `README.md`, `AGENTS.md` and `docs/specs/README.md`:
   - The product line reads "for gin-workflow projects and Beads".
   - The contexts are `projects`, `beads`, `milestones` and `reports`.
   - The sources are the `gin` CLI, `bd`, `.beads/issues.jsonl` and the beads' `ai_usage`.
   - The Windows note keeps only `gin.cmd`.
4. Run the grep of the acceptance criteria. Expected: no hit besides the PowerShell lines. Run the Docker smoke if `docker` exists.
5. Commit: `git commit -m "docs: drop Sessions, Quota and the agent CLIs from Docker, deploy and docs (gin-console-rm-retire-sessions-quota)"`

### Track 6: QA cases and their tests
- **Dependencies**: Track 3, Track 4, Track 5
- **Requirements**: REQ-BEADS-018, REQ-UI-057, REQ-DOCKER-001, REQ-DOCKER-003, REQ-DOCKER-004, REQ-DOCKER-006
- **Files**:
  - Modify `qa/cases/beads/TC-BEADS-053-pulled.e2e.md`, `TC-BEADS-054-no-remote-on-the-card.e2e.md`, `TC-BEADS-055-failed-pull-on-the-card.e2e.md`, `TC-BEADS-056-failed-pull-note.e2e.md`, `TC-BEADS-057-older-backend-without-pull.e2e.md` (re-pin to the new REQ-BEADS-018 hash; wording only where the age format is named)
  - Create a case in `qa/cases/beads/` (e2e) for the REQ-BEADS-018 "Pulled just now" scenario
  - Create cases in `qa/cases/ui/` (e2e) for the REQ-UI-057 scenarios, including "Address of a retired page"
  - Create cases in `qa/cases/` (manual) for the REQ-DOCKER-001, 003, 004 and 006 scenarios, each pointing at its `scripts/docker-smoke.sh` check
  - Create or modify the e2e specs of the new and re-pinned e2e cases under `qa/e2e/beads/` and `qa/e2e/ui/`
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases from written scenarios plus their specs in existing patterns, with one judgement per stale case.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-retire-sessions-quota` prints `ok`, and `gin-qa cases plan --change gin-console-rm-retire-sessions-quota` lists nothing missing or stale.
  - `gin-qa e2e plan` lists none of these cases as missing or stale.
  - `npx playwright test qa/e2e/beads qa/e2e/ui --trace off --workers 4` passes on the built UI.
- **Estimated complexity**: medium

Steps:
1. Run `gin-qa cases plan --change gin-console-rm-retire-sessions-quota` and `gin-qa cases check --change gin-console-rm-retire-sessions-quota`. Write, re-pin and update cases per `qa/guidelines.md` and the gin-qa cases skill: explicit URLs, one action per step, stubbable preconditions.
2. Write or update the e2e specs per the gin-qa e2e skill. Build the UI, run the specs, and fix them until they pass. Report a product defect instead of changing product code.
3. Commit: `git commit -m "test(qa): cases for the retired pages, pull age and Docker tools (gin-console-rm-retire-sessions-quota)"`

### Track 7: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5, Track 6
- **Requirements**: REQ-BEADS-018, REQ-UI-057
- **Files**:
  - Modify `docs/changes/gin-console-rm-retire-sessions-quota-retire/05-tests.md` (TC-1 result)
  - Create `qa/evidence/<date>-retire-tc1/` (gitignored, kept on disk)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**:
  - The source sweep `grep -rnE "quota|sessions|SessionLog|claude|codex|taskkill|OpenProcess" backend/src frontend/src Dockerfile docker-compose.yml scripts deploy` prints only intended hits, such as `sessionStorage`.
  - TC-1 is recorded as passed, by claude, with Playwright on the deployed build: the 6 checks of `05-tests.md`, the screenshots of `/`, a bead with children and `/sessions/alpha/s-1` looked at, and no page error.
- **Estimated complexity**: low

Steps:
1. Run the source sweep. Expected: only intended hits.
2. Deploy the branch to the Tailscale service, one command at a time:
   ```
   pnpm -C frontend install --frozen-lockfile
   pnpm -C frontend build
   uv --directory backend sync
   systemctl --user restart gin-console
   systemctl --user is-active gin-console
   curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health
   ```
   Expected: `active` and `200`.
3. Write a Playwright script outside the repo and run it with `NODE_PATH=/home/gin/scotty/node_modules node <script> qa/evidence/<date>-retire-tc1`:
   - Set localStorage `gin-console.email`, and use a 1440×900 viewport at deviceScaleFactor 2.
   - Make one check per TC-1 expectation, each in try/catch with a screenshot.
   - Fail on any `pageerror`.
4. Record TC-1 in `05-tests.md` as `pass, claude (Playwright on the Tailscale build of <commit>, N/N checks, screenshots in qa/evidence/<date>-retire-tc1)`. Commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-rm-retire-sessions-quota)"`

## Integration
- **Branch**: `feat/retire-sessions-quota`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- [ ] `gin specs lint --change gin-console-rm-retire-sessions-quota --against master` prints `ok`, and `gin specs trace --change gin-console-rm-retire-sessions-quota` lists no missing REQ.
- [ ] `gin-qa cases check --change gin-console-rm-retire-sessions-quota` prints `ok`.
- [ ] TC-1 passed on the deployed console.

## Notes
- The user may override `Model:` and `Effort:` before approval.
- The parent bead stays open until a human confirms the merge. Each track bead closes when its tests and review pass.
- At ship, `gin specs archive` applies the 31 REMOVED blocks. If the archive leaves `docs/specs/sessions/spec.md` and `docs/specs/quota/spec.md` without requirements, ship deletes both folders in the archive commit.
- The runtime image stays on `node:22-bookworm-slim`, although Node is no longer needed at run time. Moving to a slimmer base is a possible follow-up, outside this epic.

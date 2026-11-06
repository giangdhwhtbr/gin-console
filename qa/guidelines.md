# Test case guidelines

Rules for writing test cases in this repository. `/gin-qa:cases` reads this file first; its rules override the skill's defaults. Edit freely.

- Language: English.
- One user action per step.
- `Priority: high | medium | low`.
- Extra fields this team uses (kept and exported as-is): none yet.

## Types

The case types this repository uses. `gin-qa cases check` reports a case whose type is not listed here.

- `e2e`: cases a browser test can run (`/gin-qa:e2e`).
- `api`: cases checked through the HTTP API with fake CLIs (backend pytest, `backend/tests/fakes.py`, `fake_bd.py`).
- `manual`: cases a tester walks through (`/gin-qa:run`).

## E2E specs (`/gin-qa:e2e`)

- Playwright: `@playwright/test` 1.49 or later (the evidence fixture records ARIA snapshots).
- Locators: prefer `getByRole` with the accessible name; use `getByTestId` only when no stable name exists.
- Sign-in: none (the console has no authentication).
- Test data: preconditions describe what `gin-workflow` and `bd` report; specs stub the matching `/api/*` responses instead of relying on real projects. Use `stubApi` and the builders in `qa/e2e/support/api.ts` (`import { … } from '../support/api'`); `qa/e2e/milestone-ui/tc-milestone-ui-001.spec.ts` is an example. Project names in URLs are the stubbed ones (default `P`).
- Server: `playwright.config.ts` serves the built UI on `http://127.0.0.1:8701` with `qa/e2e/gin-console.yaml` (no projects) and reuses a server already running there. Run `pnpm -C frontend build` after UI changes.

## Automated types

Case types other than e2e whose tests `gin-qa tests` plans and runs (`/gin-qa:tests`). One `### <type>` per type; `Tests:` globs are relative to the repository root, never absolute or containing `..`; `{junit}` is the JUnit XML file the command writes, `{files}` (optional) the test files of the cases run.

### api
- Tests: `backend/tests/test_*_api.py`
- Run: `uv run --project backend pytest {files} --junitxml={junit}`

## Manual runs

How `/gin-qa:run` names and schedules manual runs.

- Run reference: `manual <YYYY-MM-DD>` (the date is the run's UTC date).
- When: before shipping an epic that has `manual` cases, on the build deployed to Tailscale.

## Bugs

- Tracker: Beads. `gin-qa cases bug` files each failed manual case as a bug bead linked to the case's epic.
- External reference: none

The external reference line takes `none`, `optional`, or `required`, and `required` may name a pattern as a regular expression, such as ``required, pattern `PROJ-\d+` ``. With `required`, `/gin-qa:run` asks for the reference on each failure.

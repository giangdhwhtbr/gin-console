# Test case guidelines

Rules for writing test cases in this repository. `/gin-qa:cases` reads this file first; its rules override the skill's defaults. Edit freely.

- Language: English.
- One user action per step.
- `Type: e2e` for cases a browser test can run, `api` for cases checked through the HTTP API with fake CLIs (backend pytest, `backend/tests/fakes.py`, `fake_bd.py`), `manual` otherwise.
- `Priority: high | medium | low`.
- Extra fields this team uses (kept and exported as-is): none yet.

## E2E specs (`/gin-qa:e2e`)

- Playwright: `@playwright/test` 1.49 or later (the evidence fixture records ARIA snapshots).
- Locators: prefer `getByRole` with the accessible name; use `getByTestId` only when no stable name exists.
- Sign-in: none (the console has no authentication).
- Test data: preconditions describe what `gin-workflow` and `bd` report; specs stub the matching `/api/*` responses instead of relying on real projects. Use `stubApi` and the builders in `qa/e2e/support/api.ts` (`import { … } from '../support/api'`); `qa/e2e/milestone-ui/tc-milestone-ui-001.spec.ts` is an example. Project names in URLs are the stubbed ones (default `P`).
- Server: `playwright.config.ts` serves the built UI on `http://127.0.0.1:8701` with `qa/e2e/gin-console.yaml` (no projects) and reuses a server already running there. Run `pnpm -C frontend build` after UI changes.

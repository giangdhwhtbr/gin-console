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
- Test data: preconditions describe what `gin-workflow` and `bd` report; specs stub the matching `/api/*` responses with `page.route` instead of relying on real projects.

# E2E runs from several worktrees, and ellipsis on flex labels

**Context**
Bugs gin-console-3kd and gin-console-iot (2026-11-18) were fixed in parallel worktrees, each checked with the e2e specs of epic gin-console-y4j.

**Decision/Solution**
- `playwright.config.ts` hardcodes port 8701 for both `baseURL` and `webServer`, reuses any server already there, and ignores `E2E_BASE_URL`. A second worktree running e2e at the same time needs a temporary Playwright config with another `baseURL` and no `webServer`, plus a temporary copy of `qa/e2e/gin-console.yaml` with that port; otherwise it silently tests the other worktree's `frontend/dist`. Never kill a server on 8701 you did not start.
- Ad-hoc specs must import `test` from `qa/e2e/evidence.ts` and use its `ev` fixture: it sets the sign-in email in localStorage, and a bare `@playwright/test` spec lands on the email gate (REQ-UI-097).
- `truncate` draws an ellipsis only on the element whose own inline text overflows. A label inside an `inline-flex` mark (`StateMark`) is clipped silently when the wrapper truncates; the label needs its own `<span className="truncate">` and `min-w-0` on every flex ancestor. `StateMark` now carries its label as `title` for every caller.
- In the List row, the short id (at most 24 characters, `shortId`) is never capped; the first column wraps (`flex-wrap`), so a long id pushes the title to its own line instead of clipping it below 8rem. Class assertions in jsdom cannot see this; `qa/e2e/ui/tc-ui-121.spec.ts` measures the visible title width.

- A fresh track worktree has no `backend/.venv` or `frontend/node_modules`; run `uv --directory backend sync` and `pnpm -C frontend install --frozen-lockfile` before the first commit, even for a commit that only touches `qa/`, since the pre-commit hook runs backend and frontend lint and typecheck (it can take more than 120 s, so run long commits in the background). Under a full parallel `pnpm test --run`, `ReturnFlow.test.tsx` (REQ-UI-073) can fail on timing and pass alone (epic gin-console-9ix).
- One e2e track can be split between two developers in two worktrees: the second runs Playwright from a temporary config outside the repo (absolute `testDir`, `baseURL` and `webServer` on 8702, `reuseExistingServer: false`, a copy of `qa/e2e/gin-console.yaml` on 8702); merge both branches before one full run (epic gin-console-atl).
- Playwright resolves `@playwright/test` from a `node_modules` next to its config: a fresh worktree needs `pnpm install --frozen-lockfile` at its root, and a config outside the repo needs `NODE_PATH=<worktree>/node_modules`, or sits untracked in the worktree root and is deleted afterwards. In zsh, `gin-qa cases pin $ids` passes the whole list as one argument; loop over the ids (gin-console-rm-shared-attachments, gin-console-rm-test-coverage, 2026-11-27).
- A temporary Playwright config outside the repo needs `cwd` set to the worktree root in `webServer`, otherwise `uv run --directory` fails with "No such file or directory" (gin-console-rm-my-work). A spec that presses Ctrl+K first waits for the page heading, or the keypress is lost; a stubbed blocked bead needs `blocked: true`, as the backend sets it, or the header reads Deferred. TC-UI-301 hardcodes port 8701. `App.test.tsx` (Reports routing) and `EpicPage.test.tsx` (REQ-UI-119) time out at machine load near 20 and pass alone.
- `pnpm lint` and `pnpm build` together can exceed a 120 s foreground timeout; run them in the background. Never wait for them with `pgrep -f "<pattern>"` in a loop: the loop's own command line matches the pattern and it never ends. `ruff format .` reformats backend files that were never formatted; format only the files you touch.
- A temporary console for a browser check (its own port and `GIN_CONSOLE_CONFIG`) is stopped by the pid listening on its port. `pkill -f gin_console` would also hit the deployed service on 8700, and the permission classifier denies it.
- **One-frame transitions under reduced motion:** the `prefers-reduced-motion` rule in `frontend/src/index.css` sets `transition-duration: 0.01ms` on `*`, and `transition-property` defaults to `all`, so every style change becomes a one-frame transition. Playwright runs with `reducedMotion: 'reduce'`, so right after a zoom or Fit to view a canvas has its new `style.height` while `offsetHeight` and `document.scrollHeight` are still the old values. A spec that measures geometry right after a change first polls until `getBoundingClientRect().height` matches `style.height` (`settled()` in `qa/e2e/support/lanes.ts`); TC-UI-195 failed about 1 run in 10 without it (epic gin-console-csp).

**Consequences**
- Long-id rows can be two lines tall.
- "In progress" does not fit a 184px Graph node next to "n of m done" and shows as "In progr…".

**References**
- `playwright.config.ts`, `qa/e2e/evidence.ts`, `frontend/src/features/beads/{StateMark.tsx,GraphNode.tsx,ListRow.tsx}`, `qa/e2e/ui/tc-ui-121.spec.ts`
- Beads: gin-console-3kd, gin-console-iot, gin-console-y4j, gin-console-csp (`frontend/src/index.css`, `qa/e2e/ui/tc-ui-195.spec.ts`); related [beads-filters-and-epic-kind](beads-filters-and-epic-kind.md)

**Scope**
Running e2e specs outside the main checkout, and any label or id that must be cut to fit a row, card or node.

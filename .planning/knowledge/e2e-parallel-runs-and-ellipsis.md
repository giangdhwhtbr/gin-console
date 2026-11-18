# E2E runs from several worktrees, and ellipsis on flex labels

**Context**
Bugs gin-console-3kd and gin-console-iot (2026-11-18) were fixed in parallel worktrees, each checked with the e2e specs of epic gin-console-y4j.

**Decision/Solution**
- `playwright.config.ts` hardcodes port 8701 for both `baseURL` and `webServer`, reuses any server already there, and ignores `E2E_BASE_URL`. A second worktree running e2e at the same time needs a temporary Playwright config with another `baseURL` and no `webServer`, plus a temporary copy of `qa/e2e/gin-console.yaml` with that port; otherwise it silently tests the other worktree's `frontend/dist`. Never kill a server on 8701 you did not start.
- Ad-hoc specs must import `test` from `qa/e2e/evidence.ts` and use its `ev` fixture: it sets the sign-in email in localStorage, and a bare `@playwright/test` spec lands on the email gate (REQ-UI-097).
- `truncate` draws an ellipsis only on the element whose own inline text overflows. A label inside an `inline-flex` mark (`StateMark`) is clipped silently when the wrapper truncates; the label needs its own `<span className="truncate">` and `min-w-0` on every flex ancestor. `StateMark` now carries its label as `title` for every caller.
- In the List row, the short id (at most 24 characters, `shortId`) is never capped; the first column wraps (`flex-wrap`), so a long id pushes the title to its own line instead of clipping it below 8rem. Class assertions in jsdom cannot see this; `qa/e2e/ui/tc-ui-121.spec.ts` measures the visible title width.

**Consequences**
- Long-id rows can be two lines tall.
- "In progress" does not fit a 184px Graph node next to "n of m done" and shows as "In progr…".

**References**
- `playwright.config.ts`, `qa/e2e/evidence.ts`, `frontend/src/features/beads/{StateMark.tsx,GraphNode.tsx,ListRow.tsx}`, `qa/e2e/ui/tc-ui-121.spec.ts`
- Beads: gin-console-3kd, gin-console-iot, gin-console-y4j; related [beads-filters-and-epic-kind](beads-filters-and-epic-kind.md)

**Scope**
Running e2e specs outside the main checkout, and any label or id that must be cut to fit a row, card or node.

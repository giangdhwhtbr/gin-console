# TC-QA-027: Counts and list

- **REQ:** REQ-QA-010@c04a7b48
- **Priority:** high

**Preconditions:**
- Project `alpha` with `TC-UI-002` (ui, e2e, `passed`), `TC-UI-001` (ui, api, `outdated`, last recorded `passed`) and `TC-BEADS-001` (beads, e2e, `not run`)

**Steps:**
1. Open `/tests?project=alpha`

**Expected:**
- The capability table shows `beads` and `ui` with their counts and totals, and the type table shows `api` and `e2e`
- The list shows the three cases, each with a link on its id, its type and its priority
- `TC-UI-001` reads "outdated" and "Last recorded: passed"

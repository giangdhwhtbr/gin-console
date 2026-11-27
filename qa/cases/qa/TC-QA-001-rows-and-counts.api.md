# TC-QA-001: Rows and counts

- **REQ:** REQ-QA-001@3cad0dd3
- **Priority:** high

**Preconditions:**
- Project `alpha` whose export holds `TC-UI-002` (ui, e2e, `passed`), `TC-UI-001` (ui, api, `outdated`, result `passed`) and `TC-BEADS-001` (beads, e2e, `not run`)

**Steps:**
1. Send `GET /api/qa/cases?project=alpha`

**Expected:**
- `cases` lists `TC-BEADS-001`, `TC-UI-001` and `TC-UI-002`, without steps
- `TC-UI-001` has `result` `passed` and `effective_result` `outdated`
- `by_capability` is `beads` (`not_run` 1, `total` 1) then `ui` (`passed` 1, `outdated` 1, `total` 2), `by_type` is `api` (`outdated` 1) then `e2e` (`passed` 1, `not_run` 1)

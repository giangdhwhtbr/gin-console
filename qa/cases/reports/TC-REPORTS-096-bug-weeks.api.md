# TC-REPORTS-096: Bug weeks

- **REQ:** REQ-REPORTS-041@9dc10a36
- **Priority:** medium

**Preconditions:**
- Project `alpha` with `today` 2026-11-25
- Bugs created on 2026-11-17, 2026-11-18 and 2026-11-24, the one of 2026-11-18 closed on 2026-11-24
- A second run with `today` 2027-01-08 and bugs created on 2026-12-22 and 2027-01-05

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha&days=7`
2. Send `GET /api/reports/bugs?project=alpha&days=30`

**Expected:**
- After step 1, `weeks` is 2026-11-16 with 1 opened and 0 closed, and 2026-11-23 with 1 opened and 1 closed
- After step 2, the week starts are 2026-12-07, 2026-12-14, 2026-12-21, 2026-12-28 and 2027-01-04, with 1 opened in the weeks of 2026-12-21 and 2027-01-04 and 0 opened and 0 closed in the others, including the week of 2026-12-28
- The weeks add up to `figures.opened` and `figures.closed`

# TC-REPORTS-095: Bug figures

- **REQ:** REQ-REPORTS-041@9dc10a36
- **Priority:** high

**Preconditions:**
- Project `alpha` with `today` 2026-11-25
- Bugs created on 10, 19 and 20 Nov: the first closed on 20 Nov, the second closed on 20 Nov, the third deferred
- Project `beta` with one bug created and closed before the period, and a closed bug without `closed_at`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha&days=7`
2. Send `GET /api/reports/bugs?project=beta&days=7`

**Expected:**
- After step 1, `total` is 3, `opened` 2, `closed` 2, `open_now` 1, `oldest_open_days` 5 and `median_close_days` 5.5
- After step 2, `total` is 2, `opened`, `closed` and `open_now` are 0, and `oldest_open_days` and `median_close_days` are `null`

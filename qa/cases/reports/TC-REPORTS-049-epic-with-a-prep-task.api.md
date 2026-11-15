# TC-REPORTS-049: Epic with a prep task

- **REQ:** REQ-REPORTS-003@3cabb52c
- **Priority:** high

**Preconditions:**
- Project `alpha` has open epic `e-1` without `ai_usage`
- Closed track `t-1` of 200 tokens and open track `t-2`
- Closed prep task `p-1` labelled `prep` and `prep:mockup` of 100 tokens

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `usage.epics` holds `e-1` with 300 tokens
- `e-1` has `closed_children` 1, `children` 2, `closed_prep_children` 1 and `prep_children` 1

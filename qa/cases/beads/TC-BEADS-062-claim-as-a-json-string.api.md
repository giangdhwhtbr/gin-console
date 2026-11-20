# TC-BEADS-062: Claim as a JSON string

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** medium

**Preconditions:**
- Project `alpha` has bead `a-1` whose `metadata.claim` is the string `{"holder": "bao@x.io", "expires_at": "2026-11-21T09:00:00Z"}`
- Bead `a-2` has `metadata.claim` the string `soon`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- `a-1` has `claim` `{"holder": "bao@x.io", "expires_at": "2026-11-21T09:00:00Z"}`
- `a-2` has `claim` `null`

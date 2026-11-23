# TC-BEADS-060: Track of a lane

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 270b5e7e

**Preconditions:**
- Project `alpha` has a bead with the description lines `Plan: .planning/plans/2026-11-20-shop.md, Track 2` and `Lane: be`, the labels `lane:be` and `track:2`, and `metadata.claim` `{"holder": "ann@x.io", "expires_at": "2026-11-20T16:00:00Z"}`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- The bead has `lane` `be`
- The bead has `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}`
- The bead has `claim` `{"holder": "ann@x.io", "expires_at": "2026-11-20T16:00:00Z"}`

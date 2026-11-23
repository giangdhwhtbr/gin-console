# TC-BEADS-064: Merge gate

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 5aebedf9

**Preconditions:**
- Project `alpha` has epic `e-1` with track `e-1.2` in lane `be` described `Plan: .planning/plans/2026-11-20-shop.md, Track 2`, and track `e-1.4`
- A bead `g-1` without a parent is titled `external: .planning/plans/2026-11-20-shop.md#2` and blocks `e-1.4`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- `g-1` has `waits_for` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2, "track_id": "e-1.2", "lane": "be"}`
- Every other bead has `waits_for` `null`

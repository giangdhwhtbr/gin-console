# TC-UI-172: Lane facts on a bead page

- **REQ:** REQ-UI-115@ed5e8117
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 091d3358

**Preconditions:**
- Track 2 has `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}`, lane `be` and a `claim` expiring tomorrow at 16:00

**Steps:**
1. Open `/beads/example/ex-e12.2`

**Expected:**
- The facts include Lane "be"
- The facts include Track "#2 2026-11-20-shop.md"
- The facts include Lease "until <tomorrow> 16:00"

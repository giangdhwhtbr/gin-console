# TC-UI-172: Lane facts on a bead page

- **REQ:** REQ-UI-115@ed5e8117
- **Priority:** medium

**Preconditions:**
- Track 2 has `track` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2}`, lane `be` and a `claim` expiring tomorrow at 16:00

**Steps:**
1. Open `/beads/example/ex-e12.2`

**Expected:**
- The facts include Lane "be"
- The facts include Track "#2 2026-11-20-shop.md"
- The facts include Lease "until <tomorrow> 16:00"

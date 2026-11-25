# TC-BEADS-083: Next command of an epic by stage

- **REQ:** REQ-BEADS-025@3250396f
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Open epic `e-1` in project `P`; `GET /api/beads/P/e-1/workflow` returns the stage of the test data

**Test data:**
- Stages in order: `plan`, `execute`, `progress`, `shipping-soon`

**Steps:**
1. Open `/beads/P/e-1` while its stage is `plan`
2. Open `/beads/P/e-1` while its stage is `execute`
3. Open `/beads/P/e-1` while its stage is `progress`
4. Open `/beads/P/e-1` while its stage is `shipping-soon` (not a known stage)

**Expected:**
- The header shows `/gin:plan e-1` after the first step
- The header shows `/gin:execute e-1` after the second step
- The header shows no next command after the third step
- The header shows no next command after the fourth step

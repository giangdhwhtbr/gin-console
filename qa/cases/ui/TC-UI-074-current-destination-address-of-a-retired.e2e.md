# TC-UI-074: Current destination: Address of a retired page

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 17fda181

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/sessions/alpha/s-1`

**Expected:**
- The page shows "Page not found"
- No link in the main navigation has `aria-current="page"`

# TC-UI-074: Current destination: Address of a retired page

- **REQ:** REQ-UI-057@16af801c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 9ba2f7ec

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/sessions/alpha/s-1`

**Expected:**
- The page shows "Page not found"
- No link in the main navigation has `aria-current="page"`

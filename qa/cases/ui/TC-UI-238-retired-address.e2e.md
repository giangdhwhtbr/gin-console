# TC-UI-238: Retired address

- **REQ:** REQ-UI-125@504d809e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 9593db2f

**Preconditions:**
- Projects are configured

**Steps:**
1. Open `/sessions/alpha/s-1`

**Expected:**
- The page shows "Page not found"
- No link of the main navigation has `aria-current="page"`

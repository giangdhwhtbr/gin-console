# TC-UI-074: Current destination: Address of a retired page

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** medium

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/sessions/alpha/s-1`

**Expected:**
- The page shows "Page not found"
- No link in the main navigation has `aria-current="page"`

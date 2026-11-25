# TC-UI-383: Breadcrumb from Overview

- **REQ:** REQ-UI-072@3768e26f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 77b18ca2

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`
- Bead `a-1` is titled "Fix login"

**Steps:**
1. Open `/`
2. Click the link of `a-1` in a list

**Expected:**
- The breadcrumb reads "Overview" then "Fix login"
- "Overview" goes to `/`

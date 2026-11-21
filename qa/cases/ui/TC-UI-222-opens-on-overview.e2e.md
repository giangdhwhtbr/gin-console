# TC-UI-222: Opens on Overview

- **REQ:** REQ-UI-119@fcb75f6f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-35-36
- **Checked:** 7e575d9e

**Preconditions:**
- Project `example` has epic `ex-e12` with lanes be, fe, infra and qa, and two comments

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The tabs "Overview", "Graph", "Lanes" and "Discussion (2)" are offered
- Overview is open and has `aria-selected` true
- The URL has no `tab`

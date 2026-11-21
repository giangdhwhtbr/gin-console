# TC-UI-070: Opens on Overview

- **REQ:** REQ-UI-119@fcb75f6f
- **Priority:** medium

**Preconditions:**
- Project `example` has epic `ex-e12` with lanes be, fe, infra and qa, and two comments

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The tabs "Overview", "Graph", "Lanes" and "Discussion (2)" are offered
- Overview is open and has `aria-selected` true
- The URL has no `tab`

# TC-UI-223: Tab in the URL

- **REQ:** REQ-UI-119@fcb75f6f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 7b61ff49

**Preconditions:**
- Project `example` has epic `ex-e12` with lanes be, fe, infra and qa

**Steps:**
1. Open `/beads/example/ex-e12`
2. Choose the tab "Graph"

**Expected:**
- The URL is `/beads/example/ex-e12?tab=graph`
- The Graph view with `ex-e12` as the scope is shown
- The search and the filters of the Beads views are shown

# TC-UI-203: Lanes summary

- **REQ:** REQ-UI-121@12205711
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 6b88ef49

**Preconditions:**
- Epic `ex-e12` has lanes be, fe, infra and qa
- The first open track of qa waits for be #2 (merge pending) and fe #3 (merged), and qa has 0 of 1 tracks closed

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The section "Lanes" lists be, fe, infra and qa with their states
- The qa row reads "waits for be #2 (merge pending), fe #3 (merged)"
- The qa row shows the strand followed by "0/1"
- The section offers the link "Open the Lanes tab"

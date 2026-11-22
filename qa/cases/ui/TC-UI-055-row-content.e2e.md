# TC-UI-055: Row content

- **REQ:** REQ-UI-044@5e9715e5
- **Priority:** medium

**Preconditions:**
- Project `alpha` has blocked bug `g-1` of priority P1, assigned to `alice`, with 2 comments

**Steps:**
1. Open `/beads?project=alpha&milestone=all`

**Expected:**
- The row of `g-1` shows its id, its title as a link, "Blocked", the word "bug" in the bug colour, `P1` in bold without a pill,, a comment indicator 2 and `alice`

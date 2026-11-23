# TC-UI-145: Facts as label and value

- **REQ:** REQ-UI-110@6bf5889e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** 9a4917a6

**Preconditions:**
- Epic `e-3` of project `alpha` has owner `lead@example.com`, assignee `bao` and 0 comments
- Milestone `M1` of project `P` is kicked off and shows a velocity line
- Lane `be` of epic `ex-e12` in project `example` has a header, and a track of `be` has a `claim` expiring tomorrow

**Steps:**
1. Open `/beads/alpha/e-3`
2. Open `/milestones/P/M1`
3. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- After step 1, each fact of the bead page (Assignee, Created by, Created, Updated, Comments) shows its label in the muted color and its value in the text color with a heavier weight, and the page has no Owner fact
- After step 2, each fact of the velocity line shows its label in the muted color and its value in the text color with a heavier weight
- After step 3, each fact of the `be` lane header (State, Held by, Lease, Tracks) shows its label in the muted color and its value in the text color with a heavier weight

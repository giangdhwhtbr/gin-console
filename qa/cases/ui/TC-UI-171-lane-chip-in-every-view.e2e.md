# TC-UI-171: Lane in every view

- **REQ:** REQ-UI-115@ed5e8117
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** f9903b71

**Preconditions:**
- Track 2 of `ex-e12` is `ex-e12.2`, in lane `be` and labelled `lane:be` and `track:2`
- Milestone `ex-m2` of the example project holds `ex-e12`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=list&scope=ex-e12`
2. Open `/beads?project=example&milestone=all&view=board&scope=ex-e12`
3. Open `/milestones/example/ex-m2?tab=gantt`
4. Click the expand button of `ex-e12`
5. Open `/beads/example/ex-e12.2`

**Expected:**
- After steps 1, 2, 4 and 5, the List row, Board card, Gantt child row and bead page of `ex-e12.2` each show the lane as a dot and the name "be" with the title "Lane be"
- The dot is in the muted colour, not in a lane colour
- No label reads `lane:be` or `track:2`

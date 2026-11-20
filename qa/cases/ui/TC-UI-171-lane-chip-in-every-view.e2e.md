# TC-UI-171: Lane chip in every view

- **REQ:** REQ-UI-115@e3b272f6
- **Priority:** high

**Preconditions:**
- Track 2 of `ex-e12` is `ex-e12.2`, in lane `be` and labelled `lane:be` and `track:2`
- Milestone `ex-m2` of the example project holds `ex-e12`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=list&scope=ex-e12`
2. Open `/beads?project=example&milestone=all&view=board&scope=ex-e12`
3. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
4. Open `/milestones/example/ex-m2?tab=gantt`
5. Click the expand button of `ex-e12`
6. Open `/beads/example/ex-e12.2`

**Expected:**
- After steps 1 to 3, 5 and 6, the List row, Board card, Graph node, Gantt child row and bead page of `ex-e12.2` each show the chip "be" with the title "Lane be"
- No label chip reads `lane:be` or `track:2`

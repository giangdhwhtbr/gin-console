# TC-UI-171: Lane chip in every view

- **REQ:** REQ-UI-115@e3b272f6
- **Priority:** high

**Preconditions:**
- Track 2 of `ex-e12` is in lane `be` and labelled `lane:be` and `track:2`
- The Gantt of a milestone holding `ex-e12` is shown

**Steps:**
1. Open the List view
2. Open the Board view
3. Open the Graph view
4. Open the Gantt child rows of `ex-e12`
5. Open `/beads/example/ex-e12.2`

**Expected:**
- Each of the five shows the chip "be" with the title "Lane be"
- No label chip reads `lane:be` or `track:2`

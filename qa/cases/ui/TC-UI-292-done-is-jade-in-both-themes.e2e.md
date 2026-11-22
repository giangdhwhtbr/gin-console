# TC-UI-292: Done is jade in both themes

- **REQ:** REQ-UI-059@69731486
- **Priority:** medium

**Preconditions:**
- Project `P` reports a closed task `p-1` and an open task `p-2`
- Project `P` reports milestone `M1` with a closed epic `p-e1` and an open epic `p-e2`
- The Team scope of Reports reports a closed share of beads
- Test data: jade is #0E7A5C in the light theme and #45CF9F in the dark theme

**Steps:**
1. Set the light theme
2. Open `/beads?project=P&view=list`
3. Read the colour of the state glyph of `p-1`
4. Open `/milestones/M1?project=P`
5. Read the colour of the bar of the closed epic `p-e1` on the Gantt
6. Open `/reports?project=P&scope=team`
7. Read the colour of the closed part of the Team scope bar
8. Set the dark theme
9. Repeat steps 2 to 7

**Expected:**
- In the light theme each of the three colours is #0E7A5C
- In the dark theme each of the three colours is #45CF9F

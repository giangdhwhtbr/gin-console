# TC-UI-144: No overlapping text

- **REQ:** REQ-UI-110@796f0bc7
- **Priority:** high

**Preconditions:**
- The example project is shown in the light theme

**Steps:**
1. Set the window width to 390 px
2. Open `/`
3. Open `/beads?project=example&view=list`
4. Open `/beads?project=example&view=board`
5. Open `/beads?project=example&view=focus`
6. Open `/beads?project=example&view=graph`
7. Open `/beads/example/ex-e3`
8. Open `/my-tasks`
9. Open `/milestones`
10. Open `/milestones/example/ex-m2`
11. Open `/reports?project=example&tab=team`
12. Open `/reports?project=example&tab=coverage`
13. Set the window width to 1024 px, then 1440 px, then 1920 px and repeat the opens above at each width
14. Switch to the dark theme and repeat the opens above at each of the four widths

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis

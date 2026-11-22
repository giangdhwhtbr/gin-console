# TC-UI-311: No middle dots in page text

- **REQ:** REQ-UI-139@4e59801c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 78a2ce25

**Preconditions:**
- Project `P` reports beads with several facts each, milestone `M1`, a task `ex-t1` and a task assigned to the current user
- The window is 1440px wide

**Steps:**
1. Open `/projects`
2. Read the text of the page
3. Open `/beads?project=P&view=list`
4. Read the text of the page and the document title
5. Open `/beads/P/ex-t1`
6. Read the text of the page
7. Open `/my-tasks?project=P`
8. Read the text of the page
9. Open `/milestones?project=P`
10. Read the text of the page
11. Open `/milestones/M1?project=P`
12. Read the text of the page
13. Open `/reports?project=P`
14. Read the text of the page

**Expected:**
- No text on any of these pages contains " · "
- The document title of the Beads page reads "Beads · P · gin-console"

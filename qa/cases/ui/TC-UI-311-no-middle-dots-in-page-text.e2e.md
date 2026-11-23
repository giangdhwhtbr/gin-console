# TC-UI-311: No middle dots in page text

- **REQ:** REQ-UI-139@fbddf5e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 2f2d4a92

**Preconditions:**
- Project `P` reports beads with several facts each, milestone `M1`, a task `ex-t1` and a task assigned to the current user
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=P&view=list`
2. Read the text of the page and the document title
3. Open `/beads/P/ex-t1`
4. Read the text of the page
5. Open `/my-tasks?project=P`
6. Read the text of the page
7. Open `/milestones?project=P`
8. Read the text of the page
9. Open `/milestones/P/M1`
10. Read the text of the page
11. Open `/reports?project=P`
12. Read the text of the page

**Expected:**
- No text on any of these pages contains " · "
- The document title of the Beads page reads "Beads · P · gin-console"

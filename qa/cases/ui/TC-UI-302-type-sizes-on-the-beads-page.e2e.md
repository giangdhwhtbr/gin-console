# TC-UI-302: Type sizes on the Beads page

- **REQ:** REQ-UI-137@a7a96dbb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 49720590

**Preconditions:**
- Project `P` reports a task `p-1` titled "A row title" last updated on a past date
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=P&view=list`
2. Read the computed `font-size` of the page title, of the title of `p-1`, of the date of its row and of the filter labels

**Expected:**
- The page title "Beads" is 28px
- The title of the row is 14px
- The date of the row is 12px
- The filter labels are 13px

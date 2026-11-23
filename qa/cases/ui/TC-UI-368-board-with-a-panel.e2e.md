# TC-UI-368: Board with a panel

- **REQ:** REQ-UI-148@2cdbf144
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 8670c82e

**Preconditions:**
- The Board of project `example` at 1440px wide, URL has `select=t-1`

**Steps:**
1. Open the page

**Expected:**
- `complementary "Bead details"` shows `t-1` with "Open page" and "Close details" and no breadcrumb, in a column a third of the width
- The Board columns wrap in the other two thirds

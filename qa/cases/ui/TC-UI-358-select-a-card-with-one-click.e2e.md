# TC-UI-358: Select a card with one click

- **REQ:** REQ-UI-147@a7576fab
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** eb4035a2

**Preconditions:**
- The Board of project `example` at 1280px wide with bead `t-1`

**Steps:**
1. Click the card of `t-1` outside its title

**Expected:**
- The URL has `select=t-1`
- The card has `aria-current="true"`, the identity wash and bar
- `complementary "Bead details"` shows `t-1`

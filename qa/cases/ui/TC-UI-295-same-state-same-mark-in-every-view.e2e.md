# TC-UI-295: Same state, same mark in every view

- **REQ:** REQ-UI-064@2505c50e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** a526ce84

**Preconditions:**
- Project `P` reports an in-progress task `p-1` titled "Working" with a parent epic `p-e1` so that it shows in the Tree and the Graph

**Steps:**
1. Open `/beads?project=P&view=board`
2. Read the state mark on the card of `p-1`
3. Open `/beads?project=P&view=list`
4. Read the state mark on the row of `p-1`
5. Open `/beads?project=P&view=tree`
6. Read the state mark on the row of `p-1`
7. Open `/beads?project=P&view=graph`
8. Read the state mark on the node of `p-1`

**Expected:**
- Each view shows "In progress" after a half-filled ring glyph
- The glyph is in the lapis of the theme in all four views

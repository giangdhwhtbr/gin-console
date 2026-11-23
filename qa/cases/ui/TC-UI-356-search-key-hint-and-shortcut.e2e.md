# TC-UI-356: Search key hint and shortcut

- **REQ:** REQ-UI-146@a146dd5d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 79a539e6

**Preconditions:**
- The Beads page of project `example` at 1440px wide
- Focus is on a List row

**Steps:**
1. Read the `searchbox "Search"`
2. Press `/`

**Expected:**
- Before the key the search box shows `/` in a `kbd` element at its right end
- After the key the search box has focus and holds no `/`

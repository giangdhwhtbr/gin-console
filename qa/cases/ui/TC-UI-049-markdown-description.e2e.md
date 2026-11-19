# TC-UI-049: Markdown description

- **REQ:** REQ-UI-028@286b7a7b
- **Priority:** medium

**Preconditions:**
- Bead `b-1` in project `alpha` has the description `## Change`, then `1. Format **dates**`, then a fenced code block

**Steps:**
1. Open `/beads/alpha/b-1`

**Expected:**
- The description shows a heading "Change"
- The description shows a numbered list item with "dates" in bold
- The description shows a code block

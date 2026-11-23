# TC-UI-313: Link in a sentence is underlined in the identity colour

- **REQ:** REQ-UI-139@fbddf5e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** ec5e1e24

**Preconditions:**
- Project `P` reports a task `p-1` whose description is `See [docs](https://example.com)`

**Steps:**
1. Open `/beads/P/p-1`
2. Find the link "docs" in the description
3. Read its computed `text-decoration-line`, `text-decoration-thickness` and `text-decoration-color`

**Expected:**
- "docs" is underlined (`text-decoration-line` contains `underline`)
- The line is thin (at most 1px) and in the identity colour at half strength (amethyst with alpha 0.5)

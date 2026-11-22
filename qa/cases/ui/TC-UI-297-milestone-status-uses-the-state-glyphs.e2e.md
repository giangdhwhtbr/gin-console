# TC-UI-297: Milestone status uses the state glyphs

- **REQ:** REQ-UI-064@2505c50e
- **Priority:** medium

**Preconditions:**
- Project `P` reports milestone `M1` with status active and milestone `M2` with status planned

**Steps:**
1. Open `/milestones?project=P`
2. Read the status of the row of `M1`
3. Read the status of the row of `M2`

**Expected:**
- The row of `M1` reads "Active" after a half-filled ring glyph
- The row of `M2` reads "Planned" after a dashed ring glyph

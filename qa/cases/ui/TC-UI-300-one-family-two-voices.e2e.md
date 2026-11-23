# TC-UI-300: One family, two voices

- **REQ:** REQ-UI-136@8a7acd01
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** be28a4fb

**Preconditions:**
- Project `P` reports a task `p-1` titled "Write the docs"
- Every request the page makes is recorded

**Steps:**
1. Open `/beads?project=P&view=list`
2. Read the computed `font-family` and `font-variation-settings` of the page body
3. Read the computed `font-family` and `font-variation-settings` of the id of `p-1`

**Expected:**
- The body text is set in Recursive with `MONO` 0
- The id `p-1` is set in Recursive with `MONO` 1
- No request is made for a font file whose name contains "Geist"

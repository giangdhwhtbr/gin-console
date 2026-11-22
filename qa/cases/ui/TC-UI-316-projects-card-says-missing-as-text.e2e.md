# TC-UI-316: Projects card says missing as text

- **REQ:** REQ-UI-140@7e27d5df
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-49-44
- **Checked:** bad8aa0c

**Preconditions:**
- A configured project `gone` whose directory is missing (the project list reports it with an error that its directory does not exist)

**Steps:**
1. Open `/projects`
2. Find the card of `gone`

**Expected:**
- The card says "missing" as text in the carnelian (danger colour) of the theme
- The word has no border and no background colour (no badge)

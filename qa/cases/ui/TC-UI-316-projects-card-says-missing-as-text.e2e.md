# TC-UI-316: Projects card says missing as text

- **REQ:** REQ-UI-140@f52fcd4d
- **Priority:** medium

**Preconditions:**
- A configured project `gone` whose directory is missing (the project list reports it with an error that its directory does not exist)

**Steps:**
1. Open `/projects`
2. Find the card of `gone`

**Expected:**
- The card says "missing" as text in the carnelian (danger colour) of the theme
- The word has no border and no background colour (no badge)

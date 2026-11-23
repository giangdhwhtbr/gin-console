# TC-MILESTONE-UI-109: Closed on time and closed late

- **REQ:** REQ-MILESTONE-UI-023@b9cc99e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 8ca97c45

**Preconditions:**
- Project `P` has milestone `m3` ending on Friday 27 Nov 2026 and closed on 27 Nov 2026, and milestone `m4` with the same end closed on Tuesday 1 Dec 2026

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=P&tab=team&milestone=m3`
3. Open `/reports?project=P&tab=team&milestone=m4`

**Expected:**
- After step 2, the Team tab reads "Closed, on time"
- After step 3, the Team tab reads "Closed, 2 d late"

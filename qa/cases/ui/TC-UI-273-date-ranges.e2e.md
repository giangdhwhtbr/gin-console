# TC-UI-273: Date ranges

- **REQ:** REQ-UI-131@c08d8d6a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 381dfcd0

**Preconditions:**
- The browser date is 21 Nov 2026
- Milestones of project `alpha` have the periods 2026-11-10 to 2026-12-01, 2025-11-03 to 2025-11-28 and 2026-12-14 to 2027-01-08

**Steps:**
1. Open `/milestones?project=alpha`

**Expected:**
- The periods read "10 Nov – 1 Dec", "3 Nov – 28 Nov 2025" and "14 Dec 2026 – 8 Jan 2027"

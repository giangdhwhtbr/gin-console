# TC-UI-141: Points row

- **REQ:** REQ-UI-090@19f1e80e
- **Priority:** medium

**Preconditions:**
- A report whose estimate table has a row with `estimate_days: null`, `points: 5`, `actual_days: 7` and `days_per_point: 1.4`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=delivery`

**Expected:**
- The row reads "5 pt", "7" and "1.4 d/pt"
- The row shows no estimate difference

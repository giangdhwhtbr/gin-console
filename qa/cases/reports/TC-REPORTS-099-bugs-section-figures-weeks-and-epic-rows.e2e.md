# TC-REPORTS-099: Bugs section figures weeks and epic rows

- **REQ:** REQ-REPORTS-043@022646a7
- **Priority:** high

**Preconditions:**
- Project `alpha` has a bugs report for 30 days with `opened` 13, `closed` 11, `open_now` 25, `oldest_open_days` 43 and `median_close_days` 0.5
- Its weeks are 2026-11-16 with 5 opened and 3 closed, and 2026-11-23 with none
- Its epic rows are `e-2` "Checkout" and the row of unknown source, which has 8 of the 13 opened bugs
- The window is 1280px wide

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=alpha&days=30`
2. Focus the Opened figure
3. Click the title "Checkout" in the "Bugs by epic" table

**Expected:**
- After step 1, the figures Opened, Closed, Open now, Oldest open and Median days to close read "13", "11", "25", "43 d" and "0.5 d"
- After step 1, "Bugs per week" lists two bars saying "5 opened, 3 closed" and "0 opened, 0 closed", and its legend names Opened and Closed
- After step 1, "Bugs by epic" ends with the row "Source unknown" and the note says "62% of the bugs opened in this scope have no source epic"
- After step 2, the tooltip of Opened names "Bugs found later"
- After step 3, the page `/beads/alpha/e-2` is shown

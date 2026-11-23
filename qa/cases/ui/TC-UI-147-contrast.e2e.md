# TC-UI-147: Contrast

- **REQ:** REQ-UI-110@6bf5889e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e2dc3533

**Preconditions:**
- Project `example` has kicked-off milestones `ex-m1` and `ex-m2`, each shown with its id and label

**Steps:**
1. Set the theme to light
2. Open `/reports?project=example&tab=team`
3. Open `/reports?project=example&tab=velocity`
4. Set the theme to dark
5. Open `/reports?project=example&tab=team`
6. Open `/reports?project=example&tab=velocity`

**Expected:**
- On both tabs in both themes, the id and label of `ex-m1` and `ex-m2` have a contrast of at least 4.5:1 with its background

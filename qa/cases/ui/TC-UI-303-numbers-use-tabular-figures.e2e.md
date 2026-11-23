# TC-UI-303: Numbers use tabular figures

- **REQ:** REQ-UI-137@a7a96dbb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** a8505edd

**Preconditions:**
- Project `P` reports milestone `M1` with the forecast finish 1 December and milestone `M2` with the forecast finish 11 November
- The window is 1440px wide

**Steps:**
1. Open `/milestones?project=P`
2. Read the forecast of `M1`
3. Read the forecast of `M2`
4. Read the computed `font-variant-numeric` of the elements that show numbers

**Expected:**
- The forecasts read "Finishes 1 Dec" and "Finishes 11 Nov"
- Every element that shows a number has `font-variant-numeric` containing `tabular-nums`

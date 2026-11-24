# TC-REPORTS-087: Status epic table open, closed, unsplit and failed detail

- **REQ:** REQ-REPORTS-031@0d2b9424
- **Priority:** high

**Preconditions:**
- Active milestone `m2` with open epic `e-1` "Team checkout", planned 11 Nov – 20 Nov with warning `late`, forecast 25 Nov, owner `lead`
- Open epic `e-5` without tracks or assignee, forecast 1 Jan 2027 with `estimate_source: "assumed"`
- Closed epic `e-3` closed on 20 Nov

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&milestone=m2`

**Expected:**
- `e-1` row links to `/beads/alpha/e-1` and shows its late verdict, progress strand, "11 Nov – 20 Nov", "25 Nov" and "lead"
- `e-5` row shows "Not split yet", "1 Jan 2027?" and "Unassigned"
- `e-3` row shows "Done" and "20 Nov" as its forecast

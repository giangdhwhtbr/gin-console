# TC-UI-349: Remove one filter

- **REQ:** REQ-UI-144@6edc5604
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 3197f286

**Preconditions:**
- The Beads page of project `example` with `status=open&assignee=alice`

**Steps:**
1. Click `button "Remove Status filter"`

**Expected:**
- The URL has no `status` and still has `assignee=alice`
- Status is `button "Status"`

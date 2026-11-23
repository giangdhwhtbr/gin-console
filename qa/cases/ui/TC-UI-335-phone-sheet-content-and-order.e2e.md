# TC-UI-335: Phone sheet content and order

- **REQ:** REQ-UI-084@f877255d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 71da0333

**Preconditions:**
- The Beads page of project `example` at 390px wide, `?project=example&status=open`
- The project beads have capabilities and `sprint:<name>` labels

**Steps:**
1. Click `button "Filters"`

**Expected:**
- The sheet lists Milestone, Status, Assignee, Priority, Labels, Type, Kind, Capability and Sprint in that order
- The sheet has no "Show closed"
- The sheet ends with `button "Clear filters"`

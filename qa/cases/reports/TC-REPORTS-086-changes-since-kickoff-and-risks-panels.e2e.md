# TC-REPORTS-086: Changes since kickoff and risks panels

- **REQ:** REQ-REPORTS-030@38f157bb
- **Priority:** high

**Preconditions:**
- Active milestone `m2` with `changes` (`scope_from` 24, `scope_to` 27, items: `bug_added` "total shows NaN for empty cart" on 18 Nov under "Payment page" by `chi`, `epic_added` "Gift cards" 3 points on 18 Nov, `re_estimated` "Payment page" 5 to 8 on 16 Nov)
- `risks.blocked` holds "End-to-end checkout QA" waiting 4 days on blocked "Mobile layout" (`bao`), `risks.unestimated` has 4 epics, and milestone detail has 8 of 8 open epics with `spec_confirmed: false`

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&milestone=m2`

**Expected:**
- "Changed since kickoff" reads "Scope 24 → 27 points", "Bug: total shows NaN for empty cart" ("Added 18 Nov under Payment page, chi"), "Gift cards added with 3 points", and "Payment page re-estimated from 5 to 8 points" ("16 Nov")
- "Risks" reads "End-to-end checkout QA waits on Mobile layout" ("Mobile layout is blocked too, bao, 4 days"), "4 epics have no estimate" with 3 titles and "1 more", and "8 of 8 epics: spec not approved yet"
- Bead and epic titles link to their bead pages

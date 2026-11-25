# TC-REQUIREMENTS-054: Script in Markdown

- **REQ:** REQ-REQUIREMENTS-017@53b23f04
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** b525c26f

**Preconditions:**
- A proposal holds `<script>alert(1)</script>`

**Steps:**
1. Open `/requirements/changes/<change>?project=a`

**Expected:**
- No script runs and no dialog opens
- No script element is in the page

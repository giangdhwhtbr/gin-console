# Tests: Test trends

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| manual check | REQ-QA-014, REQ-QA-015 | manual | 2026-11-28, UTC: `/api/qa/trends/gin-console?days=30&tz=UTC` of a console built from this branch (port 8791, stopped after) against a script over `gin-qa runs export --format json` (2082 runs): 2065 passed and 17 failed in the 30 days, in 8 capabilities; every capability and day matched, `problems` empty |

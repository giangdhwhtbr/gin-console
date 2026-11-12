# Tests: Team tab

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-014, REQ-REPORTS-015, REQ-REPORTS-016, REQ-UI-095 | manual | On the Tailscale deploy, `/reports?project=qwikfone` opens the Team tab on its milestone; layout and wording match `docs/specs/reports/assets/2026-11-12/mockup/index.html` in light, dark and at 400 px; pressing a member row filters figures, chart and list; `ps` shows no `gin` or `bd` started by the request |

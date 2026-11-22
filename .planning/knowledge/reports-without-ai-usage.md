# Reports without AI usage: rework from Beads

**Context**
gin-workflow retired AI usage tracking (epic gin-workflow-wkwb, decision 2026-11-21, gin 3.4.0): `gin usage collect` cost about 10 minutes per 6-track epic and missed most of the work, so nothing writes `metadata.ai_usage` any more. Reports built its AI usage, Quality and Data coverage tabs and the Team Rework figures from that metadata, and Data coverage pointed at the removed command. Epic gin-console-5c4 (2026-11-22, child of the cross-repo epic gin-harness-1u3, capability `reports-without-ai-usage`) removed it.

**Decision/Solution**
- Reports reads no `ai_usage`. The report JSON is `{generated_at, project, days, sprint, totals {closed, rework_rate}, delivery, quality {members, epics}, errors}`; tabs are Team, Delivery, Velocity and Quality, and `tab=usage`/`tab=coverage` open Team.
- Rework comes from Beads (REQ-REPORTS-019): reopens are `field_change` lines on `status` from `closed` to anything else in `.beads/interactions.jsonl` (`reports/interactions.py`, `InteractionStore`), bugs found later are `bug` beads with a `discovered-from` dependency (`beads/definitions.py` `bugs_found`), and `rework = reopens + bugs`; `rework_rate` is the share of closed beads with rework above 0. Team `rework` is an int, never null.
- `InteractionStore` keeps the parsed reopens per project and reads the log again only when its size or `mtime_ns` changes; a missing log, a bad line or an unreadable file counts nothing and never fails a report. No interval cache: measured reports took 15–194 ms and a 940-line log parses in about 4 ms (the 60-second `KeyedCache` on the answer stays).
- Failed projects show in `ReportErrors` above the tab list on every tab (REQ-UI-093); before, only Data coverage showed them.
- Review cycles, rejections, findings and waivers left Reports; epic gin-console-rm-review-audit owns them.

**Consequences**
- Interaction logs start in October 2026 (gin-workflow 2026-10-01, gin-console 2026-10-12), so earlier reopens are not counted; on 2026-11-22 only qwikfone had real reopens.
- `scripts/make_example_project.py` writes example reopens into `examples/example-project/.beads/interactions.jsonl` and two `discovered-from` bugs (`ex-qb1`, `ex-qb2`), so the Quality tab of `example` has data.
- `gin-qa cases new` reuses the lowest free IDs: the cases deleted with REQ-REPORTS-002/003/006 and REQ-UI-089/092 lent their numbers to new cases (TC-REPORTS-046..049 are REQ-REPORTS-005/007 api cases, TC-UI-078..080 are REQ-UI-091 e2e cases).
- `GET /api/milestones` (a `gin milestone list` process, about 1.26 s) is the slow request on the Reports page; it was left out of this epic.

**References**
- Change: `docs/changes/archive/2026-11-22-gin-console-5c4-no-ai-usage/`; diagram `docs/specs/reports/diagrams/rework-activity.md`; use case `docs/specs/reports/use-cases/review-rework.md`.
- Evidence: `qa/evidence/2026-11-22-no-ai-usage-tc1/`; e2e run `qa/evidence/2026-11-22T08-56-47`; api run `qa/evidence/2026-11-22T08-49-45-api`.
- Beads: gin-console-5c4.1 to .5; gin-workflow-wkwb; gin-harness-1u3.

**Scope**
gin-console backend `reports` context and `beads/definitions.py`; frontend `features/reports`; QA reports and ui cases; example data generator.

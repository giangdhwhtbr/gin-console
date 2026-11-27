# Readiness verdict

The verdict of a milestone's readiness checklist (REQ-QA-008), worked out on each request of `GET /api/qa/readiness/{project}/{milestone}` from its four items; it is never stored.

```mermaid
stateDiagram-v2
  [*] --> Unknown: a source of an item fails and no item fails
  [*] --> NotReady: an item fails
  [*] --> Ready: the four items pass
  Unknown --> NotReady: the source answers and an item fails
  Unknown --> Ready: the source answers and the four items pass
  NotReady --> Ready: cases written and passed, bugs closed, epics shipped
  NotReady --> Unknown: the failing items pass and a source fails
  Ready --> NotReady: a requirement changes, a case fails or goes outdated, a P0 or P1 bug opens
  Ready --> Unknown: a source fails
```

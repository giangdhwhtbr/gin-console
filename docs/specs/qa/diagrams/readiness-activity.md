# Release readiness

Use case: check-release-readiness

How the console works out the readiness checklist of a milestone from its epics, their requirements, the cases, the open bugs and the gates (REQ-QA-007 to REQ-QA-009, REQ-QA-012).

```mermaid
flowchart TD
  subgraph lead[Lead]
    start((Start))
    open[Open the Readiness tab]
    list[Open the list of an item]
  end
  subgraph server[Server]
    show{Milestone read?}
    scope[Find epics, then requirements they added or modified]
    anyReq{Any requirement?}
    noReq[Pass both case items: No requirement changed]
    qa{Cases and trace read?}
    unknownQa[Mark both case items unknown]
    items[Check each requirement has a case and each case passed]
    bugs[Check open P0 and P1 bugs of the epics or of no epic]
    gates[Run gin state per epic, four at a time]
    gateFail{gin state of an epic failed?}
    gateUnknown[List that epic as unknown]
    verdict[Verdict: ready, not ready or unknown]
  end
  subgraph page[Console page]
    err[Show the error and Try again]
    marks[Show the verdict and four items with marks and counts]
    entries[Show requirements, cases, bugs or epics with links]
    finish(((End)))
  end
  start --> open
  open --> show
  show -->|2e no| err
  show -->|2 yes| scope
  scope --> anyReq
  anyReq -->|3c no| noReq
  anyReq -->|yes| qa
  qa -->|3a no| unknownQa
  qa -->|3 yes| items
  noReq --> bugs
  unknownQa --> bugs
  items --> bugs
  bugs --> gates
  gates --> gateFail
  gateFail -->|3b yes| gateUnknown
  gateFail -->|no| verdict
  gateUnknown --> verdict
  verdict --> marks
  marks --> list
  list --> entries
  entries --> finish
  err --> finish
```

# Overview page

Use case: review-what-needs-me

How the Overview page shows the lists of every project first, then adds verdicts, gates and waivers (REQ-OVERVIEW-001, REQ-OVERVIEW-007, REQ-OVERVIEW-008, REQ-OVERVIEW-010).

```mermaid
flowchart TD
  subgraph lead[Team lead]
    start((Start))
    open[Open the Overview]
    follow[Open a row]
    done(((End)))
  end
  subgraph system[System]
    read[Read every project's snapshot]
    configured{Any project configured?}
    none[Say no projects are configured]
    readable{Project readable?}
    alert[Show an alert for that project]
    lists[Show lists, workload and milestones]
    second[Request verdicts, forecasts and gates]
    answered{Request answered?}
    update[Update its line or section]
    lineError[Show the error on its line]
    bead[Show the bead, with Overview as the way back]
  end
  start --> open
  open --> read
  read --> configured
  configured -->|2a no| none
  none --> done
  configured -->|yes| readable
  readable -->|2e no| alert
  alert --> lists
  readable -->|yes| lists
  lists --> second
  second --> answered
  answered -->|yes| update
  answered -->|4e no| lineError
  update --> follow
  lineError --> follow
  follow --> bead
  bead --> done
```

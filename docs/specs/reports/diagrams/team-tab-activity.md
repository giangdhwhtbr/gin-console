# Team tab

Use case: review-team-in-milestone

How the Team section of the Reports page turns one project's `bd export` snapshot into the scope, KPIs, trend and bead list of a milestone or a period, and which state it shows (REQ-REPORTS-008 to REQ-REPORTS-017, REQ-REPORTS-033 to REQ-REPORTS-036).

```mermaid
flowchart TD
  subgraph lead[Team lead]
    start((Start))
    open[Open /reports/team]
    readIt[Read the figures, the members and Across milestones]
    pickMember[Press a member row]
    pickScope[Pick a milestone or a period]
  end
  subgraph page[Console page]
    any{Project has milestones?}
    period[Write days=30 into the URL]
    late{Still the selected project and scope?}
    drop[Ignore the answer]
    note{Unassigned closed beads a fifth or more?}
    showNote[Show the unassigned note above the member table]
    view[Scope line, figures with points delivered and estimate accuracy, strand, chart, member table, Across milestones, bead list]
    filter[Figures, chart highlight and list follow the member; no new request]
    error[Show the error and Retry]
    done(((End)))
  end
  subgraph server[Console server]
    snap{Snapshot readable?}
    scope[Scope of the milestone or the period; buckets; member is the assignee's person or Unassigned]
    kpi[KPIs, points delivered shared by closed tracks, accuracy, trend of the last 6 started milestones, unassigned count]
  end
  start --> open
  open --> any
  any -->|2a no milestones| period
  period --> snap
  any -->|2 yes| snap
  snap -->|2e unreadable| error
  error --> done
  snap -->|2 readable| scope
  scope --> kpi
  kpi --> late
  late -->|stale| drop
  drop --> done
  late -->|2 current| note
  note -->|2b yes| showNote
  showNote --> view
  note -->|2 no| view
  view --> readIt
  readIt --> pickMember
  pickMember --> filter
  filter --> readIt
  readIt --> pickScope
  pickScope --> snap
```

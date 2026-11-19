# Milestone velocity

How the Milestones list and the milestone page show story points and velocity from `gin milestone list/show --json` (REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021).

```mermaid
flowchart TD
  subgraph member[Team member]
    start((Start))
    open[Open Milestones, then a milestone]
  end
  subgraph console[Console]
    list[Read list: days_per_point and each entry's velocity]
    sayDo{Entry velocity.say_do set?}
    pct[Show Say/do as a whole percent]
    dash[Show –]
    dpp{List days_per_point set?}
    card[Forecast card shows days per point, assumed when gin assumed it]
    show[Read show: velocity and each epic's points]
    vel{Milestone velocity set?}
    committed{committed_points set?}
    line[Header: Committed, Completed, Added, Say/do, d/pt with planned and accuracy]
    notkicked[Header: Not kicked off, Completed]
    nothing[No velocity in the header]
    gantt[Gantt size: p pt · n d when the epic has points]
    done(((End)))
  end
  start --> open
  open --> list
  list --> sayDo
  sayDo -->|yes| pct
  sayDo -->|no| dash
  pct --> dpp
  dash --> dpp
  dpp -->|yes| card
  dpp -->|no| show
  card --> show
  show --> vel
  vel -->|yes| committed
  vel -->|no| nothing
  committed -->|yes| line
  committed -->|no| notkicked
  line --> gantt
  notkicked --> gantt
  nothing --> gantt
  gantt --> done
```

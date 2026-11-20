# Epic page

Use case: follow-epic-lanes

How the page of an epic shows its tabs and loads the data of the Overview (REQ-UI-119 to REQ-UI-121), and how an old Dependencies link is redirected (REQ-UI-075).

```mermaid
flowchart TD
  subgraph user[Team member]
    start((Start))
    open[Open an epic page or an old Dependencies link]
    choose[Choose a tab]
    done(((End)))
  end
  subgraph browser[Browser]
    old{Old Dependencies link?}
    redirect[Replace the URL with the epic page Graph tab or the Graph view]
    isEpic{The bead is an epic?}
    plain[Show the bead page of REQ-UI-028]
    load[Load the bead, the project's beads, the workflow and the milestones]
    hasLanes{A child has a lane?}
    tabs4[Offer Overview, Graph, Lanes and Discussion]
    tabs3[Offer Overview, Graph and Discussion]
    overview[Show the Progress, Workflow and Milestone cards, the lanes summary and the tracks table]
    tab[Show the Graph view, the Lanes view or the comments with the epic as the scope]
  end
  start --> open
  open --> old
  old -->|yes| redirect
  old -->|no| isEpic
  redirect --> isEpic
  isEpic -->|no| plain
  plain --> done
  isEpic -->|yes| load
  load --> hasLanes
  hasLanes -->|yes| tabs4
  hasLanes -->|no| tabs3
  tabs4 --> overview
  tabs3 --> overview
  overview --> choose
  choose --> tab
  tab --> done
```

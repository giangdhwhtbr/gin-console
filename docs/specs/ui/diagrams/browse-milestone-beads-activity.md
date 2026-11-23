# Browse a milestone's beads

Use case: browse-milestone-beads

How a team member reads a milestone's beads on its Beads tab, goes down into an epic with "Show children" and comes back from a bead page (REQ-MILESTONE-UI-018, REQ-UI-106, REQ-UI-147, REQ-UI-149, REQ-UI-072).

```mermaid
flowchart TD
  subgraph member[Team member]
    start((Start))
    open[Open the milestone page and choose the Beads tab]
    chooseGraph[Choose the Graph view and an assignee filter]
    pickEpic[Select an epic]
    showChildren[Choose Show children]
    openTask[Double-click a task]
    back[Use the first link of the breadcrumb]
  end
  subgraph browser[Browser]
    oldLink{tab=graph in the URL?}
    list[List the milestone's beads with no Milestone filter]
    graphTab[Show the Beads tab on the Graph view]
    match{A bead matches?}
    noMatch[Say No beads match these filters]
    draw[Draw the milestone's epics with their arrows]
    wide{Window 1024px or wider?}
    panel[Show the epic in the details panel with Show children]
    epicPage[Open the epic's page, whose Graph tab draws its tasks]
    tasks[Draw the epic's tasks with a breadcrumb back to the milestone]
    page[Show the task's bead page, its breadcrumb starting with the milestone]
    restore[Show the Beads tab with the Graph view and the filter]
    done(((End)))
  end
  start --> open
  open --> oldLink
  oldLink -->|1a old link| graphTab
  oldLink -->|2 tab=beads| list
  list --> chooseGraph
  graphTab --> chooseGraph
  chooseGraph --> match
  match -->|4a none| noMatch
  match -->|4 some| draw
  noMatch --> done
  draw --> pickEpic
  pickEpic --> wide
  wide -->|5a narrower| epicPage
  wide -->|6 wide| panel
  epicPage --> done
  panel --> showChildren
  showChildren --> tasks
  tasks --> openTask
  openTask --> page
  page --> back
  back --> restore
  restore --> done
```

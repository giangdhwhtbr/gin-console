# Filter beads by milestone

Use case: filter-by-milestone

How the Beads page and My Tasks narrow to the project's current milestone, and how a team member chooses another milestone or removes the filter (REQ-UI-104, REQ-UI-105, REQ-UI-143, REQ-UI-144, REQ-BEADS-015).

```mermaid
flowchart TD
  subgraph member[Team member]
    start((Start))
    openBeads[Open the Beads page of the project]
    choose{Change the milestone?}
    pickClosed[Choose a closed milestone in the Milestone menu]
    remove[Choose the x of the Milestone chip]
    clear[Choose Clear filters]
    openTasks[Open My Tasks]
  end
  subgraph system[System]
    hasOpen{The project has an open milestone?}
    current[Select the current milestone, show its chip and its beads]
    all[Select All and show every bead]
    closedBeads[Request the closed beads and show the milestone's beads]
    allButton[Show every bead and the button Milestone]
    tasks[Select the same milestone and list the member's tasks under it]
    done(((End)))
  end
  start --> openBeads
  openBeads --> hasOpen
  hasOpen -->|2 yes| current
  hasOpen -->|2a none| all
  current --> choose
  all --> openTasks
  choose -->|3 keep| openTasks
  choose -->|2b closed milestone| pickClosed
  choose -->|2c remove| remove
  pickClosed --> closedBeads
  closedBeads --> openTasks
  remove --> allButton
  allButton --> clear
  clear --> current
  openTasks --> tasks
  tasks --> done
```

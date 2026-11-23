# Filter bar

Use case: narrow-the-beads-list

How the bead filter bar shows its filters by window width, and how a filter, a chip's "×" and "Clear filters" change the URL (REQ-UI-142 to REQ-UI-146, REQ-UI-084, REQ-UI-104).

```mermaid
flowchart TD
  subgraph lead[Team lead]
    start((Start))
    open[Open the Beads views]
    narrow[Type a search, choose a value in a menu or in More filters, or remove a chip]
    clear[Choose Clear filters]
  end
  subgraph browser[Browser]
    fixed{Milestone fixed by the page?}
    noMilestone[Leave out the Milestone filter]
    loaded{Milestones loaded?}
    unavailable[Milestone menu says Milestones unavailable, All in effect]
    current{Project has a current milestone?}
    chip[Show the chip Milestone with its title]
    plain[Show the button Milestone]
    width{Window 768px or wider?}
    bar[Show the search with the / hint, Milestone, Status, Assignee, More filters, the count and Show closed]
    sheet[Show the search and Filters with its count, the count of beads and Show closed below]
    apply[Write the filter into the URL, keep the matching beads, update the chips and counts]
    active{Any filter active?}
    offer[Offer Clear filters]
    hide[Offer no Clear filters]
    reset[Remove the search and filters from the URL, keep closed, view, group, finished, select and scope]
    done(((End)))
  end
  start --> open
  open --> fixed
  fixed -->|2c fixed| noMilestone
  fixed -->|2 not fixed| loaded
  loaded -->|2e failed| unavailable
  loaded -->|2 loaded| current
  current -->|2 yes| chip
  current -->|2a no| plain
  noMilestone --> width
  unavailable --> width
  chip --> width
  plain --> width
  width -->|2 yes| bar
  width -->|2b no| sheet
  bar --> narrow
  sheet --> narrow
  narrow --> apply
  apply --> active
  active -->|4 yes| offer
  active -->|10 no| hide
  offer --> clear
  clear --> reset
  reset --> active
  hide --> done
```

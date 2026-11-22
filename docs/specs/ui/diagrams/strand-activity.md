# Progress strand

How the frontend draws the progress of a bead's tracks or of a milestone's epics as a strand (REQ-UI-138), from `child_counts` (REQ-BEADS-022) or the Milestones list `epics` (REQ-MILESTONE-UI-025).

```mermaid
flowchart TD
  subgraph system[System]
    start((Start))
    counts[Read done, in progress, blocked, ready and deferred]
    clamp[Clamp each count at 0, Ready as what remains]
    empty{Total is 0?}
    nothing[Draw nothing]
    many{More than 16 items?}
    beads[Draw one glyph per item: done, in progress, blocked, ready, deferred]
    segments[Draw one segment per state, length by count]
    size{Large strand of the epic page?}
    sentence[Follow it with the sentence of the counts]
    count[Follow it with done/total]
    name[Name it with the sentence and add the tooltip]
    prep{Epic has prep tasks?}
    preptext[Add Prep closed/total after it]
    done(((End)))
  end
  start --> counts
  counts --> clamp
  clamp --> empty
  empty -->|yes| nothing
  empty -->|no| many
  nothing --> done
  many -->|no| beads
  many -->|yes| segments
  beads --> size
  segments --> size
  size -->|yes| sentence
  size -->|no| count
  sentence --> name
  count --> name
  name --> prep
  prep -->|yes| preptext
  prep -->|no| done
  preptext --> done
```

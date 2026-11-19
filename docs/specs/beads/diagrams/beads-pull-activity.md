# Beads pull

Use case: refresh-pulls-beads

How "Refresh data" and the scheduled pull bring a project's Beads from its Dolt remote into the console (REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-012, REQ-BEADS-018). The scheduled pull starts at "Pull every project" when its interval has passed, and logs failed projects instead of reloading a page.

```mermaid
flowchart TD
  subgraph user[Team member]
    start((Start))
    press[Activate Refresh data]
    see[See the page with the pulled beads and each project's pull line or note]
  end
  subgraph server[Server]
    pullall[Pull every project, at most four at a time]
    opted{Project exists and pull is not false?}
    skip[Leave the project out; pull stays null]
    running{A pull of this project is running?}
    wait[Wait for it and take its result]
    run[Run bd dolt pull in the project directory, 30 s at most]
    exit{Exit code 0?}
    ok[Keep status ok with the time]
    remote{Output says no remote?}
    noremote[Keep status no_remote]
    failed[Keep status error with the last output line]
    clear[Drop every snapshot and cached answer]
    answer[Respond 204]
    done(((End)))
  end
  start --> press
  press --> pullall
  pullall --> opted
  opted -->|1 yes| running
  opted -->|1a no| skip
  running -->|2 no| run
  running -->|2a yes| wait
  run --> exit
  exit -->|3 yes| ok
  exit -->|3a no| remote
  remote -->|3a yes| noremote
  remote -->|3b no| failed
  skip --> clear
  wait --> clear
  ok --> clear
  noremote --> clear
  failed --> clear
  clear --> answer
  answer --> see
  see --> done
```

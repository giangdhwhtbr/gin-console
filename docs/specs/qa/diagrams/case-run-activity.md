# Cases and latest run

Use case: review-test-results

How the console lists the cases of a project and shows the latest e2e run of one case with its step screenshots (REQ-QA-001 to REQ-QA-006, REQ-QA-010, REQ-QA-011, REQ-QA-013).

```mermaid
flowchart TD
  subgraph qa[QA]
    start((Start))
    tests[Open Tests]
    count[Activate a count]
    open[Open a case]
    thumb[Open a thumbnail]
  end
  subgraph server[Server]
    export{gin-qa export read?}
    counts[Count cases by capability, type and effective result]
    hasCases{Any case?}
    run{Run named, inside the project, result.json readable?}
    steps[Read the steps; mark screenshots that are available images]
    reason[latest_run null with its reason]
    shot{Screenshot still an available image?}
    bytes[Answer the bytes with nosniff and CSP]
    nf[Answer 404]
  end
  subgraph page[Console page]
    why[Show why: missing, too old, or error with Try again]
    empty[Show No test cases yet]
    table[Show the tables and the list]
    filtered[Filter the list, filters in the URL]
    detail[Show the case, its requirements and bug]
    runView[Show the steps with thumbnails]
    noRun[Show the reason instead of the run]
    box[Show the screenshot large]
    finish(((End)))
  end
  start --> tests
  tests --> export
  export -->|2a no| why
  export -->|2 yes| counts
  counts --> hasCases
  hasCases -->|2b no| empty
  hasCases -->|yes| table
  table --> count
  count --> filtered
  filtered --> open
  open --> detail
  detail --> run
  run -->|6 yes| steps
  run -->|6a no| reason
  steps --> runView
  reason --> noRun
  runView --> thumb
  thumb --> shot
  shot -->|7 yes| bytes
  shot -->|7e no| nf
  bytes --> box
  box --> finish
  nf --> finish
  noRun --> finish
  why --> finish
  empty --> finish
```

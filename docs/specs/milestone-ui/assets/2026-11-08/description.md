# milestone-ui: 2026-11-08

<!-- description.md of one dated asset folder, docs/specs/<capability>/assets/<YYYY-MM-DD>/, named by the day
     the inputs arrived. Kind: new (first requirements), change (the customer's changes after an earlier folder),
     or legacy (screenshots of an existing feature, kept under legacy/). A new batch of inputs gets a new folder;
     never edit an older one. `gin specs assets add` creates the folder and fills Kind and Previous;
     `gin specs assets confirm` sets Confirmed. Confirmed: no until the BA confirms the inputs, then the ISO date of that
     confirmation; a confirmed folder is frozen, and only a confirmed folder is cited as a requirement source. -->

Kind: new
Source: discuss of gin-console-cl0, 2026-11-08 (user asked for a prototype)
Previous: none
Confirmed: 2026-11-08

## Summary
Prototype of the additive Milestones change: a project forecast card above the milestone list, a Lanes column and a forecast finish per row, and the lane count in the milestone page header. The Gantt is unchanged; it draws the lane-bound dates gin-workflow returns.

## Changes
- Screen `#milestones`: forecast card (finish, deadline comparison, default lanes, open epics, unestimated, error) and the Lanes column plus "Finishes <date>" per row.
- Screen `#milestone`: "<n> lanes" next to the finish line in the header; the Gantt sketch shows bars placed one after another on 1 lane.
- The "Forecast state" control switches the card between on time, past the deadline, on the deadline, no deadline, every epic unestimated, forecast error, and an older gin-workflow (no card, "–" for lanes).

## Files
| File | Shows |
|---|---|
| `mockup/index.html` | Interactive mockup with sample data; the yellow "Mockup controls" bar and the dashed outlines are not part of the design. |

## Open questions

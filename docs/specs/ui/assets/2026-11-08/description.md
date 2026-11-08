# ui: 2026-11-08

<!-- description.md of one dated asset folder, docs/specs/<capability>/assets/<YYYY-MM-DD>/, named by the day
     the inputs arrived. Kind: new (first requirements), change (the customer's changes after an earlier folder),
     or legacy (screenshots of an existing feature, kept under legacy/). A new batch of inputs gets a new folder;
     never edit an older one. `gin specs assets add` creates the folder and fills Kind and Previous;
     `gin specs assets confirm` sets Confirmed. Confirmed: no until the BA confirms the inputs, then the ISO date of that
     confirmation; a confirmed folder is frozen, and only a confirmed folder is cited as a requirement source. -->

Kind: new
Source: discuss of gin-console-cl0, 2026-11-08 (user: bead detail description does not render Markdown)
Previous: none
Confirmed: 2026-11-08

## Summary
Prototype of the bead detail page rendering its description, acceptance criteria, design, notes and close reason as Markdown (GitHub-flavored: headings, lists, task lists, code, tables, links, quotes) instead of plain pre-wrapped text.

## Changes
- Screen `#bead-detail`: the five text sections rendered as Markdown; raw HTML is shown as text, links open in a new tab.
- "Show today's plain text beside it" shows the current rendering of the same text for comparison.

## Files
| File | Shows |
|---|---|
| `mockup/index.html` | Interactive mockup with sample bead text; the yellow control bar and dashed outlines are not part of the design. |

## Open questions

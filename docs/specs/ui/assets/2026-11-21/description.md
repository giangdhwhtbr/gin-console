# ui: 2026-11-21

<!-- description.md of one dated asset folder, docs/specs/<capability>/assets/<YYYY-MM-DD>/, named by the day
     the inputs arrived. Kind: new (first requirements), change (the customer's changes after an earlier folder),
     or legacy (screenshots of an existing feature, kept under legacy/). A new batch of inputs gets a new folder;
     never edit an older one. `gin specs assets add` creates the folder and fills Kind and Previous;
     `gin specs assets confirm` sets Confirmed, adds Confirmed by (the git user.email), and adds Agreed with
     when `--agreed-with` names who else agreed. Confirmed: no until the BA confirms the inputs, then the ISO
     date of that confirmation; a confirmed folder is frozen, and only a confirmed folder is cited as a
     requirement source. -->

Kind: change
Source: discuss of gin-console-atl, 2026-11-20 (the user found the epic page sparse and the Dependencies page clunky, and asked for a mockup); the mockup was confirmed on 2026-11-20 and moved here on 2026-11-21, because assets/2026-11-20/ was already confirmed for gin-console-5qw
Previous: assets/2026-11-20/
Confirmed: 2026-11-21
Confirmed by: giangdhwhtbr@gmail.com

## Summary
Mockup of the epic page with tabs: the header (title, badges, facts) above the tabs Overview · Graph · Lanes · Discussion. Overview holds the Progress, Workflow and Milestone cards, the Lanes summary, the Tracks table and the description. The Graph tab shows the Graph view of the Beads page with the epic as the scope and its lane boxes. The separate Dependencies page is retired.

## Changes
- Overview tab: new cards, Lanes summary and sortable Tracks table on the epic page.
- Graph tab: the Graph view scoped to the epic, with its search, filters and zoom.
- The Graph tab shots were made before gin-console-csp shipped. They show the lane boxes in tiers from top to bottom. The shipped layout wins: tiers run from left to right, with the boxes of a tier stacked (REQ-UI-117, `docs/changes/archive/2026-11-20-gin-console-csp-canvas-scroll/assets/c-light.png`), and no details panel shows until the user selects a card (REQ-UI-106).

## Files
| File | Shows |
|---|---|
| `epic-page/mockup/index.html` | Interactive mockup (`?tab=overview\|graph\|lanes\|discussion`, `&theme=dark`); the dashed "Mockup controls" bar is not part of the design; points, comments and the workflow card hold sample values. |
| `epic-page/shots/overview-light.png`, `overview-dark.png` | The Overview tab. |
| `epic-page/shots/graph-light.png`, `graph-dark.png` | The Graph tab, with the older top-to-bottom tiers (see Changes). |
| `epic-page/shots/current-epic-page.png`, `current-dependencies-page.png` | The pages before the change (legacy reference). |

## Open questions

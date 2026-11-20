# ui: 2026-11-20

<!-- description.md of one dated asset folder, docs/specs/<capability>/assets/<YYYY-MM-DD>/, named by the day
     the inputs arrived. Kind: new (first requirements), change (the customer's changes after an earlier folder),
     or legacy (screenshots of an existing feature, kept under legacy/). A new batch of inputs gets a new folder;
     never edit an older one. `gin specs assets add` creates the folder and fills Kind and Previous;
     `gin specs assets confirm` sets Confirmed, adds Confirmed by (the git user.email), and adds Agreed with
     when `--agreed-with` names who else agreed. Confirmed: no until the BA confirms the inputs, then the ISO
     date of that confirmation; a confirmed folder is frozen, and only a confirmed folder is cited as a
     requirement source. -->

Kind: change
Source: discuss of gin-console-5qw, 2026-11-20 (user asked for a mockup of lanes as coloured containers in the Graph view)
Previous: assets/2026-11-08/
Confirmed: 2026-11-20
Confirmed by: giangdhwhtbr@gmail.com

## Summary
Mockup of the Graph view of epic `ex-e12` with each lane drawn as a coloured container. The user chose variant B (lanes as clusters): lane boxes laid out by the dependencies between lanes, tracks left to right inside each box, merge gates as Waiting/Merged chips on the arrows between lanes instead of nodes, a neutral dashed "No lane" box.

## Changes
- Screen B (chosen): boxes be, fe, infra on the first row and qa below; arrows from be #2 and fe #3 to the qa box with the chips "◷ Waiting · be #2" (dashed) and "✓ Merged · fe #3"; box headers with the lane name, state, holder, lease and closed/total.
- Screen A (not chosen): lanes as vertical columns.
- Colours: the categorical palette `--lane-1..8` (light and dark steps), pale tint backgrounds and stronger borders; node state keeps its own edge, icon and word.

## Files
| File | Shows |
|---|---|
| `mockup/index.html` | Interactive mockup with sample data; the variant (A/B) and theme buttons are not part of the design. |
| `shots/b-light.png`, `shots/b-dark.png` | Variant B, chosen, in both themes. |
| `shots/a-light.png`, `shots/a-dark.png` | Variant A, not chosen. |

## Open questions

## Epic page (second batch, discuss of gin-console-atl, 2026-11-20)
Mockup of the epic page with tabs, confirmed by the user on 2026-11-20: header (title, badges, facts), tabs Overview · Graph · Lanes · Discussion; Overview with the Progress, Workflow and Milestone cards, the Lanes summary, the Tracks table and the description; the Graph tab shows the Graph view with lane boxes; the separate Dependencies page is retired.

| File | Shows |
|---|---|
| `epic-page/mockup/index.html` | Interactive mockup (`?tab=overview\|graph\|lanes\|discussion`, `&theme=dark`); the dashed "Mockup controls" bar is not part of the design; points, comments and the workflow card hold sample values. |
| `epic-page/shots/overview-light.png`, `overview-dark.png` | The Overview tab. |
| `epic-page/shots/graph-light.png`, `graph-dark.png` | The Graph tab. |
| `epic-page/shots/current-epic-page.png`, `current-dependencies-page.png` | The pages before the change (legacy reference). |

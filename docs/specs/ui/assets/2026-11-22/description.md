# ui: 2026-11-22

<!-- description.md of one dated asset folder, docs/specs/<capability>/assets/<YYYY-MM-DD>/, named by the day
     the inputs arrived. Kind: new (first requirements), change (the customer's changes after an earlier folder),
     or legacy (screenshots of an existing feature, kept under legacy/). A new batch of inputs gets a new folder;
     never edit an older one. `gin specs assets add` creates the folder and fills Kind and Previous;
     `gin specs assets confirm` sets Confirmed, adds Confirmed by (the git user.email), and adds Agreed with
     when `--agreed-with` names who else agreed. Confirmed: no until the BA confirms the inputs, then the ISO
     date of that confirmation; a confirmed folder is frozen, and only a confirmed folder is cited as a
     requirement source. -->

Kind: change
Source: direction preview of 2026-11-21 (UX review: flat 12/14/20 type scale, no identity colour, teal means both ready and closed), brought in by the discuss of gin-console-rm-strung on 2026-11-22
Previous: assets/2026-11-21/
Confirmed: 2026-11-22
Confirmed by: giangdhwhtbr@gmail.com

## Summary
The "Strung" direction for gin-console: beads are gemstones on a thread. Amethyst is the one identity colour (where you are, the primary action, focus); jade, lapis, amber and hematite are reserved for state; carnelian is for bugs and errors only. Recursive is the typeface, on a scale of 12, 13, 14, 16, 20, 28 and 40. A state reads from the shape of its glyph, and a strand of beads draws progress everywhere.

Only the token sheet (`index.html?board=tokens`), the state glyphs, the strand and the verdict column are requirement sources for gin-console-rm-strung. The page layouts of the other boards (headline sentences, the one-line filter bar, the epic header and tabs, the Reports status page, the project timeline, the WBS export, the bug lightbox) are direction for later epics and are not requirements here.

## Changes
- Screen `#tokens`: palette with light and dark values, the five state glyphs (hollow ready, half in progress, full done, knot blocked, dashed deferred), the type scale, and the strand (one bead per child up to 16, then a segmented thread).
- Screen `#beads`: a List row with no chips: glyph, id, title with plain labels and the word "bug" in carnelian, strand with "2/8", plain `P1`, avatar and date; the current nav item and the selected row in amethyst.
- Screen `#epic`: the large strand with "2 done, 1 in progress, 1 blocked, 3 ready".
- Screen `#timeline`: one continuous bar per epic in the style of its state glyph, the part past the end hatched in amber.
- Screen `#reports`: the Verdict column, one verdict per epic with an amber knot ("1 day late") or a dashed amber ring ("After the end", "No estimate").

## Files
| File | Shows |
|---|---|
| `index.html` | Interactive preview: `?board=tokens\|beads\|epic\|timeline\|reports`, `&theme=dark`. The Recursive font files are not copied, so the page falls back to the system font. |
| `tokens-light.png`, `tokens-dark.png` | The token sheet in both themes. |
| `beads-light.png` | The Beads List. |
| `epic-light.png` | The epic page header with the large strand. |
| `timeline-light.png` | The timeline bars. |
| `reports-light.png` | The verdict column and strands in a table. |

## Open questions
- None. The typeface file, the Gantt verdict and the chip rule were decided in the discuss of 2026-11-22.

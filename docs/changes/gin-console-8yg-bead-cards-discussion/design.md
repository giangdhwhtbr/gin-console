# Design: Bead cards and discussion on beads

Epic: gin-console-8yg

## Architecture
Frontend only, in `frontend/src/features/beads/` and `frontend/src/index.css`. No backend change, no new dependency.

- `StateMark.tsx` (new, extracted from `GraphNode.tsx`): the icon map, the label and the colour classes per state (`ready`, `in_progress`, `blocked`, `done`, `deferred`, from `stateOf` in `graph.ts`), exported as `StateMark` (icon and word) and `stateEdge(state)` (the 4px left-edge class). Used by `GraphNode`, `BeadCard`, `BeadTable` and `TreeRow`.
- `TypeBadge.tsx` (new): a pill with the type's name; colour per type from tokens; `task` and every other type neutral.
- `CountBadge.tsx` (new): `{ kind: "comments" | "dependencies", count }`; renders nothing when `count` is 0 or less, else an icon and the number with an accessible label ("3 comments", "2 dependencies"); the comments kind is the stronger one (muted pill, bold, ink).
- `BeadCard.tsx`: first line id (mono) and `P<n>`; the title link; a last line with `StateMark`, `TypeBadge`, the two `CountBadge`s and the assignee. A 4px left edge from `stateEdge`.
- `BeadTable.tsx`, `TreeRow.tsx`: the same `StateMark`, `TypeBadge` and `CountBadge`.
- `DiscussionPanel.tsx` (new): the heading "Discussion (n)", the Hide control (wide layout only) and the existing `CommentList`, restyled so that each comment is a bordered block with the author bold, the time muted and the text in the normal colour.
- `discussion.ts` (new): `useDiscussionHidden(): [boolean, () => void]` over a shared store, key `gin-console-discussion`, every storage access in try/catch (the same approach as `theme.ts`).
- `BeadDetailPage.tsx`: with comments, a wide layout (`lg`, not embedded) of two columns, details and a sticky column with its own scroll; otherwise a `tablist` "Details | Discussion (n)". One DOM, classes decide which form is visible. Without comments, none of it.
- `index.css`: `--state-progress` becomes blue; new tokens `--type-epic`, `--type-bug`, `--type-feature` with `@theme inline` entries `--color-type-*`.

## Data Flow
The comments are still loaded after the bead is shown, whichever tab is open (REQ-UI-039); the tab label uses `comment_count`, available at once. The hidden state is read from the store on mount and written on toggle.

## Error Handling
A failed comments request shows the error and Retry inside the Discussion column or tab only (REQ-UI-040). Storage that throws is ignored: the control works for the visit. A bead with no comments has no Discussion at all.

## Testing
Component tests for `CountBadge`, `TypeBadge`, `StateMark`, the three card forms and `BeadDetailPage` (tabs, hide and show, storage that throws, embedded form, no comments), the existing comments tests renamed for "Discussion", and `tokens.test.ts` extended with the new colours. Layout at 1280, 820 and 390px and the look of the badges are manual cases in `tests.md`.

## Colours (light / dark)
| Token | Light | Dark |
|---|---|---|
| `--state-progress` (was `#4338ca` / `#a5b4fc`) | `#1d4ed8` | `#93c5fd` |
| `--type-epic` | `#7e22ce` | `#c084fc` |
| `--type-bug` | `#b91c1c` | `#f87171` |
| `--type-feature` | `#be185d` | `#f472b6` |

Each reaches 4.5:1 as text on background, card and muted in its theme (checked by `tokens.test.ts`; if one fails, change that value, not the threshold). The type pill is the colour as text on an 8% tint of itself (`bg-type-epic/8`); `tokens.test.ts` also checks that text against the tint blended over each surface.

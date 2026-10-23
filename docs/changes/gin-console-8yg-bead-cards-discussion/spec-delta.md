# Spec Delta: Bead cards and discussion on beads

## ADDED

### REQ-UI-064: State mark
Every bead card of the Board and Focus views SHALL show the state of the bead as an icon with its name (Ready, In progress, Blocked, Done or Deferred, by the rules of REQ-UI-049) and SHALL draw a 4px edge on the left of the card in the colour of that state, the bead list and the Tree view SHALL show the same icon and name for the state, and the graph node SHALL use the same icon, name and colour.

#### Scenario: Blocked card
- GIVEN a blocked bead
- WHEN the Board is shown
- THEN its card shows "Blocked" with its icon and the left edge in the Blocked colour

#### Scenario: Same state, same mark
- GIVEN an in-progress bead shown on the Board, in the list, in the Tree and in the graph
- WHEN each view is shown
- THEN each shows "In progress" with the same icon and the same colour

#### Scenario: Edge only on cards
- GIVEN the list is shown
- WHEN a row is drawn
- THEN the row shows the state icon and name and has no coloured left edge

### REQ-UI-065: Card anatomy
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type badge of REQ-UI-067, the indicators of REQ-UI-066 and the assignee when there is one.

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", the type "task", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and the type

### REQ-UI-066: Count indicators
WHERE a bead has comments or dependencies, a bead card, a list row and a Tree row SHALL show a comment indicator, an icon with the count of comments, and a dependency indicator, an icon with the count of dependencies, each with an accessible label such as "3 comments" or "2 dependencies", SHALL show the comment indicator in a stronger style than the dependency one using no colour outside the palette, and SHALL show neither indicator, nor the text "0 comments" or "0 deps", when the count is 0.

#### Scenario: Comments
- GIVEN a bead with `comment_count` 3
- WHEN its card is shown
- THEN a comment indicator with the label "3 comments" and the number 3 is shown

#### Scenario: Nothing to show
- GIVEN a bead with `comment_count` 0 and `dependency_count` 0
- WHEN its card, list row and Tree row are shown
- THEN no indicator and no "0 comments" or "0 deps" text appears

### REQ-UI-067: Type badge
The frontend SHALL show the type of a bead as a pill that always contains the type's name, in purple for `epic`, red for `bug` and pink for `feature` with a tint of the same colour behind the text and neutral for every other type, on the Board and Focus cards, the list rows, the Tree rows and the header of the bead page.

#### Scenario: Colours by type
- GIVEN an epic, a bug, a feature and a task
- WHEN their cards are shown
- THEN the pills read "epic", "bug", "feature" and "task" and the first three are coloured and the task one is neutral

#### Scenario: Never colour alone
- GIVEN any bead
- WHEN its type badge is shown
- THEN the type's name is in the badge as text

### REQ-UI-068: Discussion column
WHILE the window is 1024px wide or more and the bead page is shown as a page, not as the details panel of another view, and the bead has comments, the bead page SHALL show the details on the left and the discussion in a column on the right with the heading "Discussion (N)", SHALL keep that column in view while the page scrolls, and SHALL let the column scroll on its own when it is taller than the window.

#### Scenario: Two columns
- GIVEN a bead with comments and a window 1280px wide
- WHEN the bead page is shown
- THEN the details are on the left and "Discussion (N)" is in a column on the right

#### Scenario: Long thread
- GIVEN a bead with a thread taller than the window
- WHEN the page is scrolled
- THEN the column stays in view and scrolls on its own

### REQ-UI-069: Discussion tabs
WHILE the window is narrower than 1024px, or the bead is shown in the details panel of another view, and the bead has comments, the bead page SHALL show the tabs "Details" and "Discussion (N)", where N is `comment_count`, as a tab list with `aria-selected` on the open tab, SHALL open "Details" first and again when another bead is shown, SHALL change tab with the Left and Right arrow keys, and SHALL show only the open tab's content.

#### Scenario: Tabs on a phone
- GIVEN a bead with `comment_count` 3 and a window 390px wide
- WHEN the bead page is shown
- THEN the tabs "Details" and "Discussion (3)" are shown and "Details" is selected

#### Scenario: Switch
- GIVEN the tab "Details" is selected
- WHEN the user selects "Discussion (3)"
- THEN the discussion is shown instead of the details and "Discussion (3)" has `aria-selected`

#### Scenario: Panel of another view
- GIVEN a bead with comments in the details panel of the Tree view
- WHEN the panel is shown
- THEN it has the same tabs

#### Scenario: No comments
- GIVEN a bead with `comment_count` 0
- WHEN the bead page is shown at any width
- THEN there are no tabs and no discussion

### REQ-UI-070: Hide and show the discussion
WHERE the discussion column of REQ-UI-068 is shown, the bead page SHALL offer the button "Hide discussion", SHALL then show the details across the whole width with the button "Show discussion (N)" at the top, SHALL keep the choice for every bead and for the next visit, and IF the browser refuses to store the choice, THEN SHALL still apply it for the current visit without an error.

#### Scenario: Hide and show
- GIVEN the discussion column is shown
- WHEN the user presses "Hide discussion"
- THEN the column is gone, the details fill the width and "Show discussion (N)" is shown

#### Scenario: Remembered
- GIVEN the user hid the discussion
- WHEN another bead with comments is opened, or the page is reloaded
- THEN the discussion is still hidden

#### Scenario: Storage refused
- GIVEN the browser throws when the choice is stored
- WHEN the user presses "Hide discussion"
- THEN the column is hidden and no error is shown

### REQ-UI-071: Comment blocks
The discussion SHALL show each comment as a block of its own with a border, with the author in bold, the time in the muted colour and the text in the normal text colour as plain text with line breaks, SHALL wrap long text, and SHALL keep the text of a comment out of the muted colour.

#### Scenario: One block each
- GIVEN a bead with 2 comments
- WHEN the discussion is shown
- THEN two blocks are shown, each with author, time and text

#### Scenario: Long unbroken text
- GIVEN a comment with a very long word
- WHEN the discussion is shown
- THEN the text wraps inside its block and the page does not scroll sideways

## MODIFIED

### REQ-UI-031: Board columns
<!-- base: 5f6d7a248a630242f3f923f1378cf60054b5858cc0f9f2256627a6f2539a6c23 -->
The Board view SHALL show the columns Backlog (status `deferred`), Ready (`ready`), In Progress (status `in_progress` or `hooked`), Blocked (`blocked`) and Done (status `closed`), each with its number of beads, SHALL put a bead in the first of those columns that fits, SHALL leave out of the Board any bead that fits none, SHALL order a column by priority and then by last update, newest first, and SHALL show each bead as a card as REQ-UI-065 describes.

#### Scenario: Placement
- GIVEN a deferred bead, a ready bead, an in-progress bead, a blocked bead and a closed bead
- WHEN the Board is shown with closed beads
- THEN each is in its own column and each column says 1

#### Scenario: Pinned bead
- GIVEN a pinned bead that is not ready, blocked or closed
- WHEN the Board is shown
- THEN it is in no column and the List still shows it

#### Scenario: Card and link
- GIVEN a ready P1 bead assigned to alice
- WHEN the Board is shown
- THEN its card shows the id, title, type, `P1`, the state "Ready" and alice, and the title links to `/beads/<project>/<id>`

#### Scenario: Empty column
- GIVEN no bead is blocked
- WHEN the Board is shown
- THEN the Blocked column says "No beads"

### REQ-UI-039: Comments section
<!-- base: 80a4cb3e26cdf0381e761b6ee06a6d85505437de2efe8d81cc1a7757400c5070 -->
WHEN a bead has comments (`comment_count` above 0), the bead page SHALL load them after the bead is shown and list them under "Discussion (N)" oldest first, each with its author, its time and its text as plain text with line breaks, SHALL say "Loading comments…" while they load, SHALL say "Comment truncated" under a truncated comment, and SHALL not request comments and not show the discussion when `comment_count` is 0.

#### Scenario: Comments listed
- GIVEN a bead with `comment_count` 2
- WHEN the bead page is shown
- THEN "Loading comments…" is shown, then "Discussion (2)" with both comments, author, time and text, oldest first

#### Scenario: No comments
- GIVEN a bead with `comment_count` 0
- WHEN the bead page is shown
- THEN no comments request is made and there is no discussion

#### Scenario: Plain text
- GIVEN a comment containing `<script>x</script>`
- WHEN the comments are shown
- THEN it appears as text and no `script` element exists

#### Scenario: Truncated comment
- GIVEN a comment marked `truncated`
- WHEN the comments are shown
- THEN "Comment truncated" appears under it

### REQ-UI-040: Comments failure and navigation
<!-- base: 9a696a921b67558d1ddb80c67e645418beb8934fe5fbcd929ae9c55fda031fa0 -->
IF the comments request fails or its answer has an unexpected shape, THEN the discussion SHALL show the error with its own Retry button that repeats only that request while the rest of the bead page stays shown, and a late comments answer for a bead that is no longer shown SHALL NOT replace the comments of the bead now shown.

#### Scenario: Failure and retry
- GIVEN the comments request answers 502 with `bd comments failed`
- WHEN the bead page is shown
- THEN the bead fields stay shown, the discussion shows `bd comments failed` and Retry, and Retry loads the comments

#### Scenario: Unexpected shape
- GIVEN the comments answer is `{"x": 1}`
- WHEN the bead page is shown
- THEN the discussion shows an error and Retry instead of failing

#### Scenario: Late answer
- GIVEN the comments of bead `a-5` are still loading and the user opens bead `a-6`
- WHEN the answer for `a-5` arrives
- THEN `a-6` keeps its own comments

### REQ-UI-059: Colour tokens
<!-- base: fab0dfcf0ea19d6091e94b26e83fe66c592838f8e1b668c786c66eba3dfada2e -->
The frontend SHALL use a neutral cool palette whose only hues are the five status colours Ready, In progress, Blocked, Done and Deferred and the three type colours of REQ-UI-067 (epic, bug, feature), defined for light and dark, SHALL show text, status colours and type colours with a contrast of at least 4.5:1 against every surface (background, card and muted) they are drawn on, SHALL draw the outline of inputs, selects and other controls with at least 3:1 against their surface (separators and card borders are decoration and are not held to this), and SHALL show priority with weight and the danger colour for P0 only, never with a further hue.

#### Scenario: Status colours exist in both themes
- GIVEN the light theme and then the dark theme
- WHEN a page uses a status colour
- THEN the colour is the one defined for that theme

#### Scenario: Type colours exist in both themes
- GIVEN the light theme and then the dark theme
- WHEN a page shows the badge of an epic, a bug or a feature
- THEN the colour is the one defined for that theme

#### Scenario: Contrast
- GIVEN the palette of a theme
- WHEN text, status colours, type colours and control outlines are measured against the surfaces they sit on
- THEN text, status colours and type colours are at least 4.5:1 and control outlines at least 3:1

## REMOVED
